import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features";
import { suggestProducts } from "@/lib/ai";
import { formatKurus } from "@/lib/utils";

const schema = z.object({
  slug: z.string().min(1),
  query: z.string().min(2).max(300),
});

// Müşteri tarafı akıllı öneri: "bugün ne yesem?"
export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { slug: body.data.slug },
  });
  if (!business || !business.active) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }
  if (!(await isFeatureEnabled(business.id, "ai_suggestion"))) {
    return NextResponse.json({ error: "Bu özellik kapalı" }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    where: { businessId: business.id, active: true },
    include: { category: { select: { name: true } } },
  });
  if (products.length === 0) {
    return NextResponse.json({ error: "Menü boş" }, { status: 400 });
  }

  try {
    const result = await suggestProducts(
      products.map((p) => ({
        name: p.name,
        category: p.category.name,
        priceTl: formatKurus(p.priceKurus),
        calories: p.calories,
        allergens: p.allergens,
      })),
      body.data.query
    );

    // Önerilen ürünlerin slug'larını da ekle (menüde linklemek için)
    const bySlug = new Map(products.map((p) => [p.name, p.slug]));
    return NextResponse.json({
      ok: true,
      suggestions: result.suggestions
        .filter((s) => bySlug.has(s.productName))
        .map((s) => ({ ...s, productSlug: bySlug.get(s.productName) })),
    });
  } catch {
    return NextResponse.json(
      { error: "Öneri alınamadı, tekrar deneyin" },
      { status: 502 }
    );
  }
}
