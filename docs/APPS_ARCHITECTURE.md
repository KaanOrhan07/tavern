# Tavern — Masaüstü ve Mobil Uygulama Mimarisi (Plan)

Hedef: **bir backend, bir sözleşme, üç istemci**. Web paneli, masaüstü ve mobil uygulamalar aynı API'yi ve aynı iş kurallarını kullanır.
Bu sürümde (2.3.0) sunucu tarafı altyapı hazır; istemciler bu temelin üstüne yazılır.

## Katmanlar

```
┌────────────────────────── İstemciler ───────────────────────────┐
│ Web panel (Next.js)  │ Masaüstü (garson/kasa) │ Mobil (garson/sahip) │
│ cookie oturum        │ Bearer token           │ Bearer token         │
└──────────┬───────────┴───────────┬────────────┴──────────┬──────────┘
           │   Aynı REST sözleşmesi (docs/CLIENT_API.md)   │
           ▼                                               ▼
      /api/panel/*   /api/v1/*   (Idempotency-Key, sürüm başlıkları)
           │
   Supabase Postgres (Prisma) · Realtime Broadcast (yenile ipucu) · Upstash (rate limit)

 Masaüstü yazdırma ajanı ──(tvd_ cihaz anahtarı)──> /api/v1/print/jobs  → ağ/USB yazıcı, (ileride) yazar kasa
```

## Hazır olanlar (2.3.0)

| Konu | Durum | Dosya |
|---|---|---|
| Bearer token ile giriş/oturum | ✅ | `src/lib/auth.ts`, `src/app/api/v1/auth/*`, `src/proxy.ts` |
| Sürüm uyumluluğu / zorunlu güncelleme | ✅ | `src/lib/app-version.ts`, `/api/v1/meta` |
| CORS (native webview) | ✅ | `src/proxy.ts` |
| Idempotent sipariş + ödeme | ✅ | `src/app/api/panel/orders*`, `src/lib/idempotency.ts` |
| Çevrimdışı kuyruk (web referansı) | ✅ | `src/lib/offline-queue.ts`, `public/sw.js`, `PanelOfflineSupport` |
| PWA (ana ekrana ekle) | ✅ | `src/app/manifest.ts`, `public/pwa/*` |
| Realtime ipuçları | ✅ | `src/lib/realtime.ts`, `src/lib/realtime-client.tsx` |
| Yazdırma kuyruğu + ajan protokolü | ✅ | `src/lib/print-queue.ts`, `/api/v1/print/*`, `src/lib/devices.ts` |
| Cihaz anahtarı yönetimi (iptal edilebilir) | ✅ | Ayarlar → Cihazlar, `/api/panel/devices` |
| Ödeme tipleri (yemek kartı vb.) | ✅ (kayıt) | `src/lib/payment-methods.ts` |
| e-Arşiv kuyruğu | 🟡 altyapı, entegratör yok | `src/lib/invoice/provider.ts`, `/api/jobs/invoices` |
| POS (yazar kasa) | 🟡 sözleşme, adaptör yok | `src/lib/pos/adapter.ts` |

## Önerilen istemci teknolojileri

**Masaüstü (garson/kasa/mutfak + yazdırma ajanı): Tauri veya Electron**
* Arayüz: mevcut web paneli (uzak URL yükler) **veya** paylaşılan React bileşenleri. İlk sürüm için en hızlısı:
  uygulama `https://tavern.com.tr/panel` yükler, native katman yalnızca *yazıcı*, *kasa çekmecesi*, *POS* ve *bildirim sesi* köprüsü sağlar.
* Yazdırma ajanı: aynı uygulamanın arka plan servisi; `GET /api/v1/print/jobs` döngüsü → ESC/POS (ağ 9100 / USB) → `ack`.
* Token'ı işletim sistemi anahtar deposunda sakla (Electron `safeStorage` / Tauri `keyring`).

**Mobil (garson + sahip): Capacitor (hızlı) veya React Native (daha yerel his)**
* Capacitor: mevcut web arayüzünü paketler; `capacitor://localhost` kökeni CORS'ta açık. Push bildirimi için FCM/APNs eklentisi.
* React Native: aynı API'yi çağıran ekranlar; `src/lib/offline-queue.ts` kuralları birebir uygulanır.
* Mağaza gereksinimi: hesap silme, gizlilik politikası, uygulama içi satın alma YOK (abonelik dışarıda) — başvuru öncesi kontrol et.

## Paylaşılacak kod (monorepo öneri)

```
packages/
  api-client/    ← fetch sarmalayıcı: Bearer, sürüm başlıkları, Idempotency-Key, 426/401 işleme, offline kuyruk
  contracts/     ← zod şemaları + TypeScript tipleri (istek/yanıt) — sunucu ve istemciler aynı tipi kullanır
  domain/        ← saf iş kuralları: order-mode, ödeme tipleri, alerjen listesi, saat dilimi
apps/
  web/ (mevcut Next.js)   desktop/   mobile/
```
Bu repoda zaten istemci güvenli saf modüller var ve taşınabilir: `src/lib/order-mode.ts`, `payment-methods.ts`, `allergens.ts`,
`appointments-shared.ts`, `business-timezone.ts`, `offline-queue.ts`.

## Yol haritası (öneri)

1. **Masaüstü yazdırma ajanı (en küçük, en değerli):** yalnızca `/api/v1/print/jobs` döngüsü + ESC/POS. Mutfak fişi otomatikleşir.
2. **Mobil garson (Capacitor, mevcut panel):** giriş, masalar, sipariş, mutfak bildirimleri, çevrimdışı kuyruk.
3. **Masaüstü kasa:** panel + kasa çekmecesi + (marka seçilince) POS adaptörü.
4. **Yerel öncelikli adisyon (opsiyonel):** tam çevrimdışı için yerel veritabanı (SQLite) + senkron; ancak ancak iş akışı sahada onaylanırsa.

## Açık kararlar (müşteri/saha ile netleşmeli)

* Uşak'ta en yaygın **yazar kasa markası** hangisi? (POS adaptörü tek marka ile başlar.)
* **e-Arşiv/e-Adisyon entegratörü** seçimi (maliyet, API kalitesi, mali müşavir uyumu).
* **Yemek kartı:** yalnızca kayıt mı, yoksa sağlayıcı (Multinet/Sodexo…) tahsilat entegrasyonu mu istenecek?
* Mobil mağaza hesapları (Apple Developer / Google Play) hangi tüzel kişilik adına açılacak?
