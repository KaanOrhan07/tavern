import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { hasEnoughStock, isOutOfStock } from "@/lib/stock";
import { afterDeduction, recipeDeductionBase } from "@/lib/units";
import type { OrderSource } from "@/generated/prisma/client";

export type NewOrderItem = { productId: string; quantity: number };

/**
 * Masaya sipariş ekler: masanın açık siparişi varsa ona kalem ekler, yoksa
 * yeni sipariş açar. Stok özelliği açıksa reçeteye göre stok düşer.
 * Tümü tek transaction içinde çalışır.
 */
export async function addItemsToTable(params: {
  businessId: string;
  tableId: string;
  items: NewOrderItem[];
  source: OrderSource;
  createdById?: string;
}) {
  const { businessId, tableId, items, source, createdById } = params;
  const stockEnabled = await isFeatureEnabled(businessId, "stock");

  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findFirst({
      where: { id: tableId, businessId },
    });
    if (!table) throw new Error("Masa bulunamadı");

    const products = await tx.product.findMany({
      where: {
        id: { in: items.map((i) => i.productId) },
        businessId,
        active: true,
      },
      include: {
        recipeItems: {
          include: { ingredient: { select: { id: true, quantity: true, unit: true } } },
        },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Ürün bulunamadı");
      if (item.quantity < 1) throw new Error("Geçersiz adet");
      if (stockEnabled && isOutOfStock(product)) {
        throw new Error(`"${product.name}" tükendi`);
      }
      if (stockEnabled && !hasEnoughStock(product, item.quantity)) {
        throw new Error(`"${product.name}" için yeterli stok yok`);
      }
    }

    let order = await tx.order.findFirst({
      where: { tableId, businessId, status: "OPEN" },
    });
    order ??= await tx.order.create({
      data: { businessId, tableId, source, createdById },
    });

    const createdItems = [];
    for (const item of items) {
      const product = productMap.get(item.productId)!;
      createdItems.push(
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            unitKurus: product.priceKurus,
            quantity: item.quantity,
          },
        })
      );

      if (stockEnabled) {
        for (const recipeItem of product.recipeItems) {
          const ingredient = recipeItem.ingredient;
          const deductBase = recipeDeductionBase(
            recipeItem.amount,
            ingredient.unit,
            item.quantity
          );
          const next = afterDeduction(ingredient.quantity, ingredient.unit, deductBase);
          await tx.ingredient.update({
            where: { id: recipeItem.ingredientId },
            data: next,
          });
        }
      }
    }

    await tx.notification.create({
      data: {
        businessId,
        type: "NEW_ORDER",
        message: `${table.name}: yeni sipariş (${items.length} kalem)`,
      },
    });

    return {
      order,
      items: createdItems,
      tableName: table.name,
      ticketItems: createdItems.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
      })),
    };
  });
}

/** Sipariş kalemini siler ve düşülen stoğu geri ekler. */
export async function removeOrderItem(businessId: string, itemId: string) {
  const stockEnabled = await isFeatureEnabled(businessId, "stock");

  return prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findFirst({
      where: { id: itemId, order: { businessId, status: "OPEN" } },
      include: { product: { include: { recipeItems: { include: { ingredient: true } } } } },
    });
    if (!item) throw new Error("Sipariş kalemi bulunamadı");
    if (item.paidQuantity > 0) {
      throw new Error("Ödemesi alınmış kalem silinemez");
    }

    if (stockEnabled && item.product) {
      for (const recipeItem of item.product.recipeItems) {
        const ingredient = recipeItem.ingredient;
        const deductBase = recipeDeductionBase(
          recipeItem.amount,
          ingredient.unit,
          item.quantity
        );
        const current = await tx.ingredient.findUnique({
          where: { id: recipeItem.ingredientId },
        });
        if (!current) continue;
        const next = afterDeduction(current.quantity, current.unit, -deductBase);
        await tx.ingredient.update({
          where: { id: recipeItem.ingredientId },
          data: next,
        });
      }
    }

    await tx.orderItem.delete({ where: { id: item.id } });

    // Siparişte kalem kalmadıysa siparişi iptal et
    const remaining = await tx.orderItem.count({
      where: { orderId: item.orderId },
    });
    if (remaining === 0) {
      await tx.order.update({
        where: { id: item.orderId },
        data: { status: "CANCELLED", closedAt: new Date() },
      });
    }
    return { ok: true };
  });
}

/**
 * Kısmi/tam ödeme kaydeder. Her kalemden kaç adet ödendiği belirtilir.
 * Tüm kalemler ödendiyse sipariş kapanır (masa boşalır).
 */
export async function recordPayment(params: {
  businessId: string;
  orderId: string;
  method: "CASH" | "CARD";
  itemPayments: { itemId: string; quantity: number }[];
}) {
  const { businessId, orderId, method, itemPayments } = params;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, businessId, status: "OPEN" },
      include: { items: true },
    });
    if (!order) throw new Error("Açık sipariş bulunamadı");

    const itemMap = new Map(order.items.map((i) => [i.id, i]));
    let amountKurus = 0;

    for (const payment of itemPayments) {
      const item = itemMap.get(payment.itemId);
      if (!item) throw new Error("Sipariş kalemi bulunamadı");
      const unpaid = item.quantity - item.paidQuantity;
      if (payment.quantity < 1 || payment.quantity > unpaid) {
        throw new Error(`"${item.productName}" için geçersiz ödeme adedi`);
      }
      amountKurus += item.unitKurus * payment.quantity;
      await tx.orderItem.update({
        where: { id: item.id },
        data: { paidQuantity: { increment: payment.quantity } },
      });
    }

    if (amountKurus === 0) throw new Error("Ödenecek kalem seçilmedi");

    await tx.payment.create({
      data: { businessId, orderId, method, amountKurus },
    });

    // Tüm kalemler ödendi mi?
    const items = await tx.orderItem.findMany({ where: { orderId } });
    const allPaid = items.every((i) => i.paidQuantity >= i.quantity);
    if (allPaid) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }

    return { amountKurus, orderClosed: allPaid };
  });
}
