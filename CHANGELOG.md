# Changelog

## 3.1.1 — Ekim 2026

### Düzeltme
- **Canlıda fotoğraf yükleme hatası giderildi.** Vercel (Linux) üzerinde `sharp` görsel işleme kütüphanesinin native kütüphanesi (libvips `.so`) serverless fonksiyon paketine dahil edilmiyordu; bu yüzden randevu galerisi, hizmet/personel görseli, ürün fotoğrafı ve logo/banner yüklemeleri 500 hatası veriyordu. `next.config.ts` → `outputFileTracingIncludes` ile `@img/sharp-linux-x64` ve `@img/sharp-libvips-linux-x64` tüm `/api/**` rotalarına zorla dahil edildi.

## 3.1.0 — Ekim 2026

### Müşteri randevu deneyimi (yeniden yazıldı)
- Yeni `BookingWidget`: adım adım akış (hizmet → personel → gün → saat → bilgiler), görselli hizmet kartları (kart içi açıklama + süre/fiyat), dairesel personel avatarları, Ken Burns kapak, işletme galerisi şeridi
- Aşağı kaydırdıkça tepki veren akan gradyan (`.aurora`, `--sp` scroll ilerlemesi), dokunmatik geri bildirim (`pressable`), seçim halkaları, iskelet (skeleton) slot yükleme, yapışkan özet çubuğu
- Mobil öncelikli ve `prefers-reduced-motion` uyumlu; 360 px (Galaxy S23/S24, Redmi Note) ile iPhone X/11/13/16 genişliklerinde kaymadan çalışır, güvenli alan (safe-area) boşlukları
- İşletme teması (renk/font/köşe) köprüsü artık randevu sayfasına da uygulanıyor
- Randevu sayfası tam genişlikte kapakla açılır (`[isletmeSlug]/randevu` yan boşluğu kırar)

### İşletme görselleri (şema + ayarlar)
- `Service.imageUrl`, `Service.description`, `User.imageUrl` (personel avatarı), `BusinessInfo.galleryUrls` eklendi (migration `20261029100000_tavern_3_1_0_booking`)
- `storage.uploadBookingImage` (hizmet/personel/galeri, webp, 800px, ayrı klasör)
- Hizmetler: düzenleme formunda görsel + kısa açıklama; kartta küçük önizleme
- Personeller: her personele dairesel avatar yükleme
- Ayarlar → Randevu Sayfası Galerisi: en fazla 8 vitrin fotoğrafı ekle/sil (`/api/panel/booking-gallery`)

### Berber raporları (yeni)
- `getBarberReports` + `/api/panel/reports/barber`; `BarberReportsView`
- KPI: ciro, tamamlanan randevu, ortalama işlem, gelmedi oranı (önceki dönem karşılaştırmalı)
- Grafikler: günlük ciro (alan), günlük randevu (sütun), yoğun saatler, gün×saat ısı haritası, hizmet ve personel performansı (ciro/adet sıralama); CSV indir
- Raporlar sayfası işletme türüne göre dallanır (berber → `BarberReportsView`); berber paneline "Raporlar" menüsü eklendi

### Panel randevu ekranı
- `AppointmentsBoard` 3.0.1 tasarım sistemine taşındı: `PageHeader`, KPI `StatCard`'ları, `Segmented` görünüm seçici, lucide ikonlu eylemler, iskelet yükleme

### Müşteri hesabı — randevu aksiyonları
- İşletmenin önerdiği alternatif saati tek tıkla kabul/ret (`/api/public/appointments/respond` — mevcut uç)
- Yaklaşan randevuyu iptal et
- Tamamlanan randevu sonrası Google yorum kartı (`/{işletme}/yorum`, tıklama sayacı)

### Müşteri UI tarzları (tema)
- Yeni hazır tarzlar: **Glassmorphism** (buzlu cam), **Minimalism** (sade), **Y2K** (neon/retro-fütürist); **Luxury** fontu Playfair Display'e güncellendi
- Yeni fontlar: Space Grotesk, Orbitron, Syne (`ALLOWED_FONTS`)
- Tema ekranında her tarzın **görsel önizlemesi** (renk/köşe/cam efekti + gerçek font), seçili işaretçi; büyük canlı önizleme de preset fontunu gösterir
- Tema tamamen işletmeye özel kalır: `ThemeSettings` `businessId`'ye bağlı, müşteri layout'una inline CSS değişkeniyle uygulanır; bir işletmenin tarzı diğerini etkilemez. Seçilen tarz menü + randevu sayfasının ikisine birden uygulanır

## 3.0.1 — Ekim 2026

### Tasarım sistemi
- `globals.css`: hareket (süre/easing), gölge ve grafik renk tokenları; `sheet-up` dahil eksik animasyonlar tanımlandı; `:focus-visible` halkası, `prefers-reduced-motion`, skeleton, glass, safe-area yardımcıları
- `ui.tsx`: Button (loading/size), Skeleton, PageHeader, Segmented, StatCard; `lucide-react` ile tutarlı SVG ikonlar (emoji/unicode ikonlar kaldırıldı)
- Bağımlılıksız SVG grafik seti (`components/charts`): alan, sütun, halka, sıralı çubuk, sparkline, ısı haritası; tooltip (fare + klavye), erişilebilir özet ve "tablo olarak göster"

### Müşteri tarafı
- İşletme teması (renk/font/köşe) Tailwind token köprüsüyle menüye uygulanır (yalnızca özelleştirilmiş temalarda; varsayılan görünüm değişmez); seçili fontlar Google Fonts ile yüklenir
- Karşılama: Ken Burns kapak, görselli kategori kartları, yol tarifi/bilgi hapları
- Menü: yapışkan arama + scroll-spy kategori şeridi, diyet filtreleri, kart içi +/− sepet kontrolü, boş sonuç durumu
- Sepet çubuğu (animasyonlu, toplam), garson/hesap/puan hızlı eylemleri, ürün sayfası (Esc, sürükleyerek kapat, SVG ikonlar)
- Düzeltme: `overflow-x-hidden` yapışkan çubuğu bozuyordu → `overflow-x-clip`

### İşletme paneli
- Yeni kabuk: gruplu kenar çubuğu, aktif öğe göstergesi, mobil alt çubuk (4 + Daha fazla), "içeriğe geç" bağlantısı
- Komut paleti (Ctrl/⌘+K veya `/`): sayfa + ürün/masa/müşteri/hizmet/randevu araması (`/api/panel/search`)
- Genel Bakış yeniden tasarlandı (restoran + berber); Raporlar grafikli (`/api/panel/reports/overview`, 7/30/90 gün, önceki dönem karşılaştırması)
- Masalar: durum rengi, ödeme ilerlemesi, arama + filtre, iskelet yükleme
- Ayarlar: arama ve bölüme atlama çipleri

## 2.3.0 — Ekim 2026

### Faz 1 — Menü uyumu
- **AI etiket onayı (güvenlik):** Kalori/alerjen/diyet etiketleri AI tarafından hesaplanır ama **otomatik onaylanmaz**; Menü sayfasındaki "AI Etiket Onayı" ekranında işletme kontrol edip onaylayana kadar müşteriye gösterilmez. Önceki sürümde otomatik "onaylı" olan etiketler migration ile yeniden incelemeye alındı. Onaylanmamış üründe müşteriye "alerjen bilgisi doğrulanmadı, personele danışın" yazılır
- **İçerik bilgisi:** İçindekiler listesi, 🍷 alkol / 🐖 domuz alanları (reçeteden öneri), AB 14 standart alerjen (6 dilde adlar), özelleştirilebilir menü uyarı notu
- **Test OTP kapatıldı:** `000000` / ekranda kod yalnızca yerel geliştirmede; production'da hiçbir env ile açılamaz
- **Garson + QR aynı anda (BOTH):** Hem garson hem müşteri sipariş verebilir; QR için konum şartı geçerli
- **Google yorum:** Ödeme sonrası "Google'da değerlendir" kartı; NFC kart / masa QR için kalıcı bağlantı `/{işletme}/yorum` (tıklama sayacı)
- **Admin 2FA (TOTP):** Hesap Güvenliği sayfası, RFC 6238 uyumlu, tekrar kullanım koruması, alt admin 2FA sıfırlama, acil durum `ADMIN_TOTP_DISABLE`

### Faz 2 — Tek sistem olmak (altyapı)
- **Ödeme tipleri:** Yemek kartı (Multinet/Sodexo/Edenred/Metropol/SetCard/Paye) ve diğer; şimdilik kayıt. Günlük rapor + CSV dağılımı
- **Realtime:** Supabase Broadcast ile "yenile" ipuçları (mutfak, masalar, bildirimler, randevular); veri taşımaz, polling yedeği sürer
- **Yazdırma ajanı:** `PrintJob` kuyruğu, `/api/v1/print/jobs` + `ack`, cihaz anahtarları (Ayarlar → Cihazlar)
- **Çevrimdışı adisyon:** PWA (manifest + service worker), yerel işlem kuyruğu, idempotent garson siparişi
- **e-Arşiv / POS:** `InvoiceRecord` kuyruğu + sağlayıcı arayüzü, `PosAdapter` sözleşmesi (entegratör / marka seçimi bekleniyor)

### Masaüstü + mobil uygulama altyapısı
- Bearer token (`/api/v1/auth/*`), sürüm uyumluluğu (`/api/v1/meta`, 426), CORS, ortak idempotency sözleşmesi
- Belgeler: `docs/CLIENT_API.md`, `docs/APPS_ARCHITECTURE.md`

### Diğer
- CSV dışa aktarma: formül enjeksiyonu koruması ve İstanbul saatiyle "bugün"
- Ürün/menü değişince müşteri menü önbelleği anında yenilenir

## 2.2.2 — Ekim 2026

- **Menü Excel:** Ayarlar'da mevcut menüyü indir / boş şablonu indir / Excel'den toplu yükle. Önizleme (kaydetmez) → içe aktar; kategori otomatik, aynı kategori+ürün güncellenir, varyantlar `Ad=Fiyat; …`, formül enjeksiyonu korumalı, en fazla 1000 satır / 2 MB, silme yok
- **Ücretsiz doğrulama kanalı:** Müşteri kaydında e-posta alınır; doğrulama ve PIN sıfırlama kodu e-postayla gider (Brevo veya Resend; SMS ancak Netgsm tanımlıysa ek olarak). Yeni sütun: `CustomerProfile.email`
- **Admin şifre görüntüleme / Groq key:** `CREDENTIAL_ENCRYPTION_KEY` yoksa anahtar AUTH_SECRET'tan HKDF ile türetilir (env eklenirse eski kayıtlar okunmaya devam eder). 2.2.1 öncesi işletmelerde şifre bir kez yenilenince görünür
- **Sipariş modu:** QR siparişe geçiş reddedilince gerçek neden (Google Maps konumu gerekli) ekranda gösterilir

## 2.2.1 — Eylül 2026

### Yönetim ve güvenlik
- Çok seviyeli admin: ana admin (`ADMIN_KEY`, şifresiz) ve alt adminler (anahtar + şifre). Alt admin hesap oluşturamaz, log/şifre/Groq ayarını göremez
- `/admin/loglar`: tüm adminlerin (ana admin dahil) işlemleri — ad soyad, işlem, tarih/saat
- İşletme şifresi AES-256-GCM ile şifreli kopya olarak saklanır (`CREDENTIAL_ENCRYPTION_KEY`); yalnızca ana admin görür, her görüntüleme loglanır; ana admin şifre değiştirebilir
- Groq API key panelden değiştirilir (doğrulanır, şifreli saklanır, anında devrede); geçersiz `qwen/qwen3.6-27b` yedek modeli kaldırıldı, kota (429/5xx) durumunda sıradaki modele geçilir
- İşletme sil (çift onay, yalnızca ana admin) ve aktif/pasif; admin detayında yanıltıcı "Salt Okunur" rozeti düzeltildi
- Kalan senkron rate limit uçları Redis'e (`rateLimitAsync`) taşındı; OTP gönderim/doğrulama telefon başına sınırlı

### Bildirimler
- `src/lib/sms.ts` (Netgsm) ve `src/lib/email.ts` (Resend); şifre sıfırlama e-postası artık gerçekten gönderilir
- pg_cron + pg_net zamanlayıcı (`supabase/pg_cron.sql`), `/api/jobs/appointments` ve `/api/jobs/payments`
- Randevu onay/red/alternatif saat/iptal SMS'i; randevuya 1 saat kala MÜŞTERİYE SMS (eskiden personele 30 dk)
- Test modu: debug'da OTP "000000" geçerli (Netgsm canlıya alınınca `CUSTOMER_OTP_DEBUG` kaldırılmalı)

### Randevu / berber
- Randevular sayfası: Onay Bekleyenler, Bugünün Programı, Yaklaşan Randevular + haftalık takvim (personel filtresi/renk kodu)
- Çalışma günleri (UI + sunucu doğrulaması); müşteri tarih seçicisinde kapalı günler pasif
- Personel yalnızca kendi randevularını görür ve yönetir; bildirimler ilgili personele yönlenir

### Müşteri ve giriş
- Ana sayfada rol seçimi (Müşteri / İşletme / Personel)
- "Beni hatırla" (90 gün; işaretsizse tarayıcı kapanınca biten oturum), müşteri PIN sıfırlama (SMS OTP)
- Google Maps linkinden otomatik konum; YouTube/Facebook/LinkedIn dahil sosyal medya linkleri; menüde "tıkla git" butonları
- QR menü 100 m konum kısıtı (işletme başına kapatılabilir, GPS doğruluğu toleranslı)
- Karşılama ekranı: "Giriş yap" rozeti logo ile çakışmıyor, bulanık arka plan, boş durum, gerçek kategori grid'i

### Restoran
- Adisyon: Bekliyor → Hazırlanıyor → Hazır; garson ekranında durum rozetleri ve "henüz hazır değil" uyarısı; polling 8 sn
- Garson ekranında VIP / sık müşteri rozeti (tier · ziyaret · puan)
- Günlük rapor PDF (ciro, ürün satışı, personel bazlı sipariş, tahmini malzeme tüketimi)
- Fotoğraf yükleme: önerilen boyut bilgisi ve 4 MB sınırı (oran korunarak yeniden boyutlandırma zaten mevcuttu)

### Hata düzeltmeleri
- Proxy: `/panel/[slug]/sifre-sifirla` ve `/api/panel/password-reset/*` oturum olmadan erişilemiyordu; `/panel/hesabim/[slug]` müşteri geçmişi yanlışlıkla işletme girişine yönleniyordu
- "Bugün" hesabı sunucu UTC'sinde olduğu için 00:00–03:00 TR arası yanlış güne düşüyordu (gün sonu, ciro)
- Teslim geri alınınca kalem DELIVERED durumunda takılı kalıyordu
- `?next=` açık yönlendirme (open redirect) kapatıldı; işletme bilgi bağlantıları yalnızca http/https
- Admin müşteri detay sayfasında çift header
- Garson çağır / hesap iste uçlarına rate limit
- i18n: DE/ES/RU/AR eksik 17 çeviri anahtarı tamamlandı

### İkinci kontrol turu (güvenlik / hata)
- Konum kısıtı sertleştirildi: sipariş, garson çağır ve hesap iste için en fazla 15 dk eski konum kanıtı; kaba (IP/Wi-Fi) konumlar reddedilir; koordinatı olmayan işletmede QR sipariş kapalı; QR sipariş açıkken kısıt kapatılamaz
- Puan kullanımı artık yalnızca giriş yapmış müşterinin kendi numarasında (önceden telefonu bilen herkes başkasının puanını harcayabiliyordu); puan sorgusuna rate limit
- Çift rezervasyon: aynı saate gelen iki bekleyen talep de onaylanabiliyordu, artık personel çakışması onay/alternatif saatte engellenir
- Reçete malzemeleri işletmeye ait olmalı (ürün/hizmet güncelleme ve hizmet oluşturma); tekrar eden malzeme 500 yerine hata mesajı
- Google Maps linki: izin sayfası yönlendirmesi ve bozuk % dizileri işleniyor; medya proxy `..` reddediyor
- Yeni işletme şifre alanı 10 karakter kuralıyla uyumlu

### Bilinen eksikler
- Admin 2FA (TOTP) henüz yok; `AdminUser.twoFactorSecret` şemada duruyor
- Netgsm hesabı/başlığı bağlanana kadar SMS gönderilmez (uygulama hata vermez, loga yazar)

## 1.1.0 — 17 Temmuz 2026

### Berber / kuaför modülü
- Randevu ızgarası, hizmet süresi ve personel müsaitliği
- Misafir randevu (isim + telefon), personel seçimi ve müşteri iptali
- Panel: Randevular, Hizmetler ve randevu ayarları (slot, açılış/kapanış)
- İşletme türüne göre panel ve müşteri yönlendirmesi

### Restoran iyileştirmeleri
- QR masa sayfasında tam menü (günün önerisi, çok satanlar, AI öneri)
- AI kalori/alerjen onay akışı ve menüde kalori rozeti

### Admin ve güvenlik
- İşletme listesinde tür/durum filtresi
- Giriş rate limit ve 30 dk hareketsizlikte otomatik çıkış

## 1.0.2 — Temmuz 2026

- Sadakat puanı ve ürün varyantları
- Footer, profil, toplu zam, çok satanlar, günün önerisi
- Groq AI entegrasyonu ve müşteri sepeti iyileştirmeleri
