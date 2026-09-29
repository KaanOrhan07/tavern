# Changelog

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
