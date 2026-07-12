/**
 * Uçtan uca API testi (geliştirme ortamı için).
 * Akış: admin girişi → işletme oluştur → sahip girişi → masa/kategori/malzeme
 * → ürün (storage anahtarı henüz olmadığı için doğrudan DB ile) → garson PIN girişi
 * → sipariş → teslim → kısmi ödeme → tam ödeme → gün sonu raporu → stok kontrolü.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const BASE = "http://localhost:3000";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  OK  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function cookieFrom(res: Response): string {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

async function main() {
  // --- 1. Admin girişi ---
  const adminLogin = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: process.env.ADMIN_KEY }),
  });
  check("Admin girişi", adminLogin.ok);
  const adminCookie = cookieFrom(adminLogin);

  const badLogin = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "yanlis-anahtar" }),
  });
  check("Yanlış admin anahtarı reddediliyor", badLogin.status === 401);

  // --- 2. İşletme oluştur ---
  const type = await prisma.businessType.findUnique({ where: { key: "restaurant" } });
  check("İşletme türü seed edilmiş", Boolean(type));

  const suffix = Date.now().toString(36);
  const ownerEmail = `demo-${suffix}@tavern.test`;
  const createBiz = await fetch(`${BASE}/api/admin/businesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: `Demo Kafe ${suffix}`,
      typeId: type!.id,
      ownerName: "Demo Sahip",
      ownerEmail,
      ownerPassword: "demo123456",
    }),
  });
  const bizData = await createBiz.json();
  check("İşletme oluşturma", createBiz.ok, JSON.stringify(bizData));
  const slug: string = bizData.business.slug;

  // --- 3. Sahip girişi ---
  const ownerLogin = await fetch(`${BASE}/api/panel/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "owner", slug, email: ownerEmail, password: "demo123456" }),
  });
  check("İşletme sahibi girişi", ownerLogin.ok);
  const ownerCookie = cookieFrom(ownerLogin);

  // --- 4. Masa, kategori, malzeme ---
  const tableRes = await fetch(`${BASE}/api/panel/tables`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ name: "Masa 1" }),
  });
  const tableData = await tableRes.json();
  check("Masa oluşturma (+QR token)", tableRes.ok && Boolean(tableData.table?.qrToken));
  const tableId: string = tableData.table.id;

  const catRes = await fetch(`${BASE}/api/panel/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ name: "Ana Yemekler" }),
  });
  const catData = await catRes.json();
  check("Kategori oluşturma", catRes.ok);

  const ingRes = await fetch(`${BASE}/api/panel/ingredients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ name: "Dana Kıyma", unit: "g", quantity: 5000 }),
  });
  const ingData = await ingRes.json();
  check("Malzeme oluşturma", ingRes.ok);

  // --- 5. Ürün (storage anahtarı yokken doğrudan DB ile, reçeteli) ---
  const product = await prisma.product.create({
    data: {
      businessId: bizData.business.id,
      categoryId: catData.category.id,
      name: "Köfte",
      slug: "kofte",
      priceKurus: 25000,
      imageUrl: "https://placehold.co/400x400/1b1916/d4a857?text=Kofte",
      recipeItems: { create: [{ ingredientId: ingData.ingredient.id, amount: 150 }] },
    },
  });
  check("Ürün + reçete oluşturma (DB)", Boolean(product.id));

  // --- 6. Garson hesabı + PIN girişi ---
  const staffRes = await fetch(`${BASE}/api/panel/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ name: "Demo Garson", pin: "1234" }),
  });
  check("Garson hesabı oluşturma", staffRes.ok);

  const staffLogin = await fetch(`${BASE}/api/panel/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "staff", slug, pin: "1234" }),
  });
  check("Garson PIN girişi", staffLogin.ok);
  const staffCookie = cookieFrom(staffLogin);

  // --- 7. Garson siparişi (2 köfte) ---
  const orderRes = await fetch(`${BASE}/api/panel/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffCookie },
    body: JSON.stringify({ tableId, items: [{ productId: product.id, quantity: 2 }] }),
  });
  const orderData = await orderRes.json();
  check("Garson sipariş girişi", orderRes.ok, JSON.stringify(orderData));

  // Stok düştü mü? 5000 - 2*150 = 4700
  const ingAfterOrder = await prisma.ingredient.findUnique({
    where: { id: ingData.ingredient.id },
  });
  check("Stok siparişle otomatik düştü (4700g)", ingAfterOrder?.quantity === 4700, `mevcut: ${ingAfterOrder?.quantity}`);

  // Bildirim oluştu mu?
  const notif = await prisma.notification.findFirst({
    where: { businessId: bizData.business.id, type: "NEW_ORDER" },
  });
  check("Yeni sipariş bildirimi oluştu", Boolean(notif));

  // --- 8. Masa detayı + teslim işaretleme ---
  const detailRes = await fetch(`${BASE}/api/panel/tables/${tableId}`, {
    headers: { Cookie: staffCookie },
  });
  const detail = await detailRes.json();
  check("Masa detayı (açık sipariş görünüyor)", detailRes.ok && detail.order?.items?.length === 1);
  const itemId: string = detail.order.items[0].id;
  const orderId: string = detail.order.id;

  const deliverRes = await fetch(`${BASE}/api/panel/orders/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: staffCookie },
    body: JSON.stringify({ delivered: true }),
  });
  check("Teslim edildi işaretleme", deliverRes.ok);

  // --- 9. Kısmi ödeme (1 adet nakit) ---
  const pay1 = await fetch(`${BASE}/api/panel/orders/${orderId}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffCookie },
    body: JSON.stringify({ method: "CASH", itemPayments: [{ itemId, quantity: 1 }] }),
  });
  const pay1Data = await pay1.json();
  check("Kısmi ödeme (1 adet)", pay1.ok && pay1Data.orderClosed === false, JSON.stringify(pay1Data));

  // --- 10. Kalan ödeme (masa kapanmalı) ---
  const pay2 = await fetch(`${BASE}/api/panel/orders/${orderId}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffCookie },
    body: JSON.stringify({ method: "CARD", itemPayments: [{ itemId, quantity: 1 }] }),
  });
  const pay2Data = await pay2.json();
  check("Kalan ödeme → masa otomatik kapandı", pay2.ok && pay2Data.orderClosed === true, JSON.stringify(pay2Data));

  const closedOrder = await prisma.order.findUnique({ where: { id: orderId } });
  check("Sipariş durumu CLOSED", closedOrder?.status === "CLOSED");

  // --- 11. Gün sonu raporu ---
  const dayRes = await fetch(`${BASE}/api/panel/reports/day`, {
    headers: { Cookie: ownerCookie },
  });
  const dayData = await dayRes.json();
  check("Gün sonu raporu (500 TL ciro)", dayRes.ok && dayData.totalKurus === 50000, JSON.stringify(dayData));

  // --- 12. Sipariş modu dışlayıcılığı ---
  const modeRes = await fetch(`${BASE}/api/panel/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ orderMode: "CUSTOMER_QR" }),
  });
  check("Sipariş modu değiştirme", modeRes.ok);

  const waiterBlocked = await fetch(`${BASE}/api/panel/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffCookie },
    body: JSON.stringify({ tableId, items: [{ productId: product.id, quantity: 1 }] }),
  });
  check("Müşteri QR modunda garson siparişi engelleniyor", waiterBlocked.status === 403);

  // --- 13. Müşteri QR siparişi ---
  const customerOrder = await fetch(`${BASE}/api/public/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      qrToken: tableData.table.qrToken,
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  check("Müşteri QR siparişi", customerOrder.ok);

  // --- 14. Kalem silme → stok iadesi ---
  const detail2 = await fetch(`${BASE}/api/panel/tables/${tableId}`, {
    headers: { Cookie: ownerCookie },
  }).then((r) => r.json());
  const newItemId: string = detail2.order.items[0].id;
  const delRes = await fetch(`${BASE}/api/panel/orders/items/${newItemId}`, {
    method: "DELETE",
    headers: { Cookie: ownerCookie },
  });
  check("Sipariş kalemi silme", delRes.ok);
  const ingAfterDelete = await prisma.ingredient.findUnique({
    where: { id: ingData.ingredient.id },
  });
  check("Silinen kalemin stoğu iade edildi (4700g)", ingAfterDelete?.quantity === 4700, `mevcut: ${ingAfterDelete?.quantity}`);

  // --- 15. Talep sistemi ---
  const reqRes = await fetch(`${BASE}/api/panel/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffCookie },
    body: JSON.stringify({ text: "Bulaşık süngeri lazım" }),
  });
  check("Personel talebi oluşturma", reqRes.ok);

  // --- 16. Müşteri menü sayfaları (HTML) ---
  const menuPage = await fetch(`${BASE}/${slug}/menu`);
  const menuHtml = await menuPage.text();
  check("Müşteri menü sayfası açılıyor", menuPage.ok && menuHtml.includes("Köfte"));

  const productPage = await fetch(`${BASE}/${slug}/menu/kofte`);
  check("Müşteri ürün detay sayfası açılıyor", productPage.ok);

  const tablePage = await fetch(`${BASE}/${slug}/masa/${tableData.table.qrToken}`);
  check("Müşteri masa (QR) sayfası açılıyor", tablePage.ok);

  // --- 17. Admin pasifleştirme → erişim kapanmalı ---
  const deactivate = await fetch(`${BASE}/api/admin/businesses/${bizData.business.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ active: false }),
  });
  check("Admin: işletmeyi pasifleştirme", deactivate.ok);

  const menuAfter = await fetch(`${BASE}/${slug}/menu`);
  check("Pasif işletmenin müşteri sayfası kapalı (404)", menuAfter.status === 404);

  const panelAfter = await fetch(`${BASE}/api/panel/tables`, {
    headers: { Cookie: ownerCookie },
  });
  check("Pasif işletmenin panel API'si kapalı (403)", panelAfter.status === 403);

  // Geri aktifleştir (demo işletme kullanılabilir kalsın)
  await fetch(`${BASE}/api/admin/businesses/${bizData.business.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ active: true }),
  });

  console.log(`\nSonuç: ${passed} başarılı, ${failed} başarısız`);
  console.log(`Demo işletme: ${slug} (sahip: ${ownerEmail} / demo123456, garson PIN: 1234)`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("Test hatası:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
