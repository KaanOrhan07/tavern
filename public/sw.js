/* Tavern service worker — yalnızca /panel için.
 *  - Statik dosyalar (JS/CSS/font/ikon): önbellekten (cache-first)
 *  - Panel sayfaları: önce ağ, çevrimdışıysa SON BAŞARILI kopya (salt okunur görünüm)
 *  - API istekleri ASLA önbelleğe alınmaz (güncel/yetkili veri); çevrimdışı yazma işlemleri istemci kuyruğundadır
 *  - Çıkışta panel sayfa önbelleği temizlenir (paylaşılan cihazda başka kullanıcının sayfaları kalmasın)
 */
const VERSION = "tavern-sw-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_PAGES") {
    event.waitUntil(caches.delete(PAGES_CACHE));
  }
});

const OFFLINE_HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Çevrimdışı</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#333;color:#f5f5f7;font-family:system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:20px;margin:0 0 8px}p{color:#bbb;margin:0 0 16px}button{background:#A53CFF;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:15px}</style></head><body><div><h1>Bağlantı yok</h1><p>İnternet gelince bu sayfa otomatik açılır. Bekleyen siparişleriniz kayıtlıdır.</p><button onclick="location.reload()">Tekrar dene</button></div></body></html>`;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API: dokunma (ağdan git)
  if (url.pathname.startsWith("/api/")) return;

  // Statik varlıklar: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/pwa/") ||
    url.pathname === "/tavern-logo.png"
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Panel sayfa gezinmeleri: network-first, çevrimdışıysa son kopya
  if (req.mode === "navigate" && url.pathname.startsWith("/panel/")) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && res.type === "basic") {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cached = await (await caches.open(PAGES_CACHE)).match(req);
          return (
            cached ||
            new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } })
          );
        }
      })()
    );
  }
});
