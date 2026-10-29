# Tavern İstemci API Sözleşmesi (Masaüstü · Mobil · Yazdırma Ajanı)

Bu belge, web paneli dışındaki **tüm istemcilerin** (masaüstü uygulaması, mobil uygulamalar, yazdırma ajanı,
ileride POS köprüsü) aynı sunucuyla nasıl konuşacağını tanımlar. Amaç: **tek backend, tek sözleşme** — web, masaüstü
ve mobil birbirinin aynı davranışını görür.

> Sunucu: `https://tavern.com.tr` (örnekler). Tüm yanıtlar JSON, hatalar `{ "error": "..." }`.

## 1. Kimlik doğrulama

İki tür kimlik vardır:

| Tür | Kim kullanır | Nasıl alınır | Başlık |
|---|---|---|---|
| **Kullanıcı token'ı** (JWT) | İnsan kullanıcı: işletme sahibi / personel (masaüstü, mobil, tablet) | `POST /api/v1/auth/login` | `Authorization: Bearer <token>` |
| **Cihaz anahtarı** (`tvd_…`) | İnsan olmayan cihaz: yazdırma ajanı | Panel → Ayarlar → Cihazlar | `Authorization: Bearer tvd_…` |

### Giriş
```
POST /api/v1/auth/login
{ "mode": "owner", "slug": "kosk-kafe", "email": "…", "password": "…" }
{ "mode": "staff", "slug": "kosk-kafe", "pin": "1234" }
(opsiyonel) "remember": false   → 12 saatlik token (varsayılan: true → 90 gün)
```
Yanıt: `{ ok, token, tokenType:"Bearer", expiresInSec, user, business, features, realtimeChannel }`

* Token'ı **güvenli depoda** saklayın (iOS Keychain / Android Keystore / Electron `safeStorage`). Düz dosyaya yazmayın.
* `GET /api/v1/auth/me` açılışta token'ı doğrular ve güncel işletme/özellik bilgisini verir (401 → tekrar giriş).
* `POST /api/v1/auth/logout` istemci tarafı çıkıştır; `{ "all": true }` tüm cihazlardaki oturumları sonlandırır.
* Token, web çerezindeki oturumla **aynıdır** — mevcut tüm `/api/panel/*` uçları Bearer ile de çalışır.

## 2. Sürüm uyumluluğu

Her istekte gönderin:
```
X-Tavern-App: desktop | mobile
X-Tavern-App-Version: 1.4.2
```
`GET /api/v1/meta` (kimlik gerektirmez) → `{ api:"v1", server, minAppVersion:{desktop,mobile}, upgradeRequired, realtime, capabilities }`.
Sunucu `MIN_APP_VERSION_DESKTOP/MOBILE` env'inin altındaki sürüme `426` döner (`upgradeRequired:true`) — uygulama güncelleme ekranı göstermelidir.
`/api/v1` yolu **geriye dönük uyumludur**; kırıcı değişiklik `v2`'de gelir.

## 3. Uçlar (özet)

Mevcut panel uçları (`/api/panel/*`) Bearer token ile çalışır. İstemciler için en önemlileri:

| Amaç | Uç |
|---|---|
| Masalar / masa detayı | `GET /api/panel/tables`, `GET /api/panel/tables/{id}` |
| Sipariş ver (garson) | `POST /api/panel/orders` *(idempotent)* |
| Kalem durumu (mutfak) | `PATCH /api/panel/orders/items/{id}` `{ status: "PREPARING"|"READY"|"DELIVERED" }` |
| Ödeme al | `POST /api/panel/orders/{id}/pay` *(idempotent)* `{ method: "CASH"|"CARD"|"MEAL_CARD"|"OTHER", methodDetail?, itemPayments:[{itemId,quantity}] }` |
| Mutfak ekranı | `GET /api/panel/kitchen` |
| Bildirimler | `GET /api/panel/notifications` |
| Randevular | `GET /api/panel/appointments?week=YYYY-MM-DD`, `PATCH /api/panel/appointments` |

Yetki: personel yalnızca kendi randevularını görür, sahip her şeyi görür — sunucu uygular, istemci tekrar etmek zorunda değil.

## 4. Idempotency (çift işlem koruması) — ZORUNLU

Yazma işlemlerinde (özellikle sipariş ve ödeme) her mantıksal işlem için **bir kez** UUID üretin:
```
Idempotency-Key: 6f3c1c1e-0a52-4a0e-9e9e-4d0b5d6b9e0a
```
Aynı anahtarla tekrar gelen istek, ilk yanıtı aynen döner (`X-Idempotent-Replay: true`); işlem iki kez uygulanmaz.
Anahtar 24 saat geçerlidir. Ağ hatasında **aynı anahtarla** yeniden deneyin.

## 5. Çevrimdışı çalışma (adisyon)

Referans uygulama: `src/lib/offline-queue.ts` (web). Mobil/masaüstü aynı kuralları uygular:

1. Yazma isteği için UUID üret → `Idempotency-Key`.
2. **Ağ hatası** (bağlantı yok) → isteği yerel kuyruğa yaz (url, method, body, key, zaman), kullanıcıya "kuyrukta" göster.
3. Bağlantı gelince **sırayla** gönder: 2xx → sil; **401** → oturum yenile (kuyruk kalır); **429/5xx/ağ** → dur, sonra tekrar dene;
   diğer **4xx** → kalıcı hata: kuyruktan çıkar, kullanıcıya göster.
4. Çevrimdışıyken **okuma** için son başarılı yanıtları yerelde tutun (salt okunur görünüm).
5. Ödeme gibi para hareketlerini kuyruğa almadan önce kullanıcıdan onay isteyin (çevrimdışı tahsilat riski).

## 6. Gerçek zamanlı güncelleme (Realtime)

Sunucu, Supabase Realtime **Broadcast** ile `tavern:{businessId}` kanalına yalnızca **"yenile" ipucu** yollar
(`orders`, `tables`, `kitchen`, `notifications`, `appointments`, `print`). Olaylar **veri taşımaz**; istemci ipucunu alınca
ilgili API'den veriyi kendi kimliğiyle çeker. Bu yüzden anon anahtar bilgisi tek başına hiçbir iş verisini açığa çıkarmaz.

* Bağlantı bilgisi: `GET /api/v1/meta` → `realtime.url`, `realtime.anonKey`, `realtime.channelPrefix`.
* İstemci tarafı örneği: `src/lib/realtime-client.tsx`.
* **Yedek polling şart:** kanal kopsa bile istemci 10–30 sn aralıkla yenilemeli (web istemci bunu yapar; Realtime bağlıyken sıklık 4 kat seyrelir).
* 250 ms içindeki olayları birleştirin (debounce).

## 7. Yazdırma ajanı protokolü

Mutfak fişleri sunucuda **kuyruğa** yazılır; masaüstündeki küçük bir ajan (veya masaüstü uygulamanın arka plan servisi)
yerel/ağ yazıcısına basar.

```
Panel → Ayarlar → Cihazlar → "Yazdırma ajanı" ekle → tvd_… anahtarı (BİR KEZ gösterilir)

GET  /api/v1/print/jobs?limit=10         Authorization: Bearer tvd_…
→ { jobs: [{ id, kind, printerKey, payload, attempt, createdAt }] }      (işler bu cihaza ATANIR)

POST /api/v1/print/jobs/{id}/ack         { "ok": true }  |  { "ok": false, "error": "Kağıt bitti" }
```
* Ajan 2–3 sn'de bir çağırır (veya Realtime `print` ipucunda hemen).
* 2 dk içinde `ack` gelmeyen iş yeniden dağıtılır; en fazla 5 deneme, sonra `FAILED`.
* İş türleri ve payload:
  * `KITCHEN_TICKET`: `{ orderId, tableName, createdAt, source:"WAITER"|"CUSTOMER", items:[{name, quantity, note}] }`
  * `TEST`: `{ text }`
  * `RECEIPT`, `POS_SALE`: ileride (aşağıya bakın).
* İşler en az bir kez teslim edilir (at-least-once); ajan `orderId` ile yinelenenleri kendi tarafında bastırabilir.
* Aynı anda hem tarayıcı yazdırması hem ajan açıksa **çift fiş** çıkar; birini seçin.

## 8. Ödeme tipleri ve raporlar

`CASH`, `CARD`, `MEAL_CARD` (marka `methodDetail`: Multinet, Sodexo, Edenred (Ticket), Metropol, SetCard, Paye Kart), `OTHER`.
Şu an yalnızca **kayıt** tutulur (sağlayıcı tahsilat entegrasyonu yok). Günlük rapor PDF'i ve CSV bu dağılımı içerir.

## 9. e-Arşiv / e-Adisyon ve yazar kasa (POS) — hazırlık

* **e-Arşiv:** `Business.invoiceProvider` (`none` | `stub` | gerçek entegratör anahtarı). Sipariş kapanınca `InvoiceRecord(PENDING)` açılır,
  `POST /api/jobs/invoices` (cron) bağlı `InvoiceProvider`'a iletir. Entegratör eklemek: `src/lib/invoice/provider.ts` → `PROVIDERS`.
* **POS:** yazar kasa donanımı yerel olduğundan entegrasyon **masaüstü ajanında** yaşar. Sözleşme: `src/lib/pos/adapter.ts`
  (`PosAdapter`, `PosSaleRequest`). Planlanan akış: ödeme → `PrintJob(kind:"POS_SALE")` → ajan marka adaptörüyle satışı yapar → `ack` (fiş no).
  Önce sahada en yaygın tek marka seçilmeli (Uşak için) — marka kararı gelince adaptör yazılır.

## 10. CORS ve ağ

Native webview/Electron kökenleri (`capacitor://localhost`, `ionic://localhost`, `app://tavern`, `http(s)://localhost`) `/api/v1` ve `/api/panel`
için CORS ile açıktır. Ek köken: `APP_ALLOWED_ORIGINS=https://x.com,app://y` env'i. **Çerez paylaşılmaz**; native istemci Bearer kullanır.
React Native / saf native HTTP istemcileri CORS'tan etkilenmez.

## 11. Güvenlik kuralları (istemci tarafı)

* Parola/PIN'i asla kaydetmeyin; yalnızca token'ı güvenli depoda tutun.
* Cihaz kaybında: işletme sahibi Ayarlar → Cihazlar'dan anahtarı iptal eder; kullanıcı token'ı için "tüm cihazlardan çık" (`logout {all:true}`).
* Sertifika sabitleme (pinning) önerilir; `tavern.com.tr` dışına istek atmayın.
* Hata yanıtlarını kullanıcıya olduğu gibi göstermek serbesttir (Türkçe ve gizli bilgi içermez).
