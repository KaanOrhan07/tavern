export const RELEASE_NOTES = [
  {
    version: "3.1.1",
    date: "Ekim 2026",
    highlights: [
      "Düzeltme: Canlıda (Vercel) fotoğraf yükleme hatası giderildi — randevu galerisi, hizmet/personel görseli, ürün fotoğrafı ve logo/banner yüklemeleri artık çalışıyor (sunucuya görsel işleme kütüphanesi doğru şekilde paketleniyor)",
    ],
  },
  {
    version: "3.1.0",
    date: "Ekim 2026",
    highlights: [
      "Yepyeni randevu alma deneyimi: görselli hizmet/personel kartları, Ken Burns kapak, aşağı kaydırdıkça akan gradyan, dokunmatik geri bildirim ve adım adım akış — menüyle aynı kalite",
      "Mobil öncelikli: iPhone (X/11/13/16) ve Android (Galaxy S23/S24, Redmi Note) dahil dar ekranlarda kaymayan, güvenli alanlara duyarlı yerleşim",
      "İşletme teması (renk/font/köşe) artık randevu sayfasına da uygulanıyor",
      "Ayarlar: randevu sayfası galerisi (vitrin fotoğrafları), hizmet görseli + kısa açıklama, personel avatarı",
      "Berber raporları: ciro, tamamlanan randevu, ortalama işlem, gelmedi oranı; günlük ciro/randevu, yoğun saatler, gün×saat ısı haritası, hizmet ve personel performansı; CSV indir",
      "Panel randevu ekranı yenilendi: KPI kartları, ikonlu eylemler, iskelet yükleme",
      "Müşteri hesabından: işletmenin önerdiği alternatif saati tek tıkla kabul/ret, randevu iptali ve tamamlanan randevu sonrası Google yorum kartı",
      "Yeni müşteri UI tarzları: Glassmorphism, Minimalism, Y2K, Luxury — Tema ekranında görsel önizlemeleriyle seçilir; her tarz yalnızca kendi işletmenizin menü + randevu sayfasına uygulanır",
    ],
  },
  {
    version: "3.0.1",
    date: "Ekim 2026",
    highlights: [
      "Yeni tasarım sistemi: hareket/yükseklik/grafik tokenları, SVG ikonlar, klavye odak halkası, azaltılmış hareket desteği, iskelet (skeleton) yükleme durumları",
      "Müşteri menüsü: görsel ağırlıklı karşılama, yapışkan arama + kategori şeridi (kaydırmayı izler), vegan/vejetaryen/glutensiz filtreleri, tek dokunuşla sepete ekle, animasyonlu sepet çubuğu, aşağı çekerek kapanan ürün sayfası",
      "İşletme temasındaki renk, font ve köşe yuvarlaklığı artık müşteri menüsüne gerçekten uygulanıyor",
      "Panel: gruplu menü, Ctrl/⌘+K ile hızlı arama (sayfa, ürün, masa, müşteri, randevu), mobil alt çubuk + Daha fazla çekmecesi, Ayarlar'da arama ve bölüme atlama",
      "Grafikli raporlar: günlük ciro, haftanın günü/saat dağılımı, yoğunluk haritası, ödeme türleri, en çok satanlar; önceki dönemle karşılaştırma; 7/30/90 gün; CSV indir",
      "Yeni Genel Bakış: ciro eğilimi, doluluk, açık masalar, dikkat gerektirenler (talep, onay bekleyen AI etiketleri); berber paneli için randevu/gelir grafikleri",
    ],
  },
  {
    version: "2.3.0",
    date: "Ekim 2026",
    highlights: [
      "Menü uyumu: AI etiketleri artık işletme onayı olmadan müşteriye gösterilmez (AI Etiket Onayı ekranı); içindekiler, alkol/domuz bilgisi, AB 14 standart alerjen ve menü uyarı notu",
      "Sipariş modu: Garson + Müşteri QR aynı anda (BOTH); ödeme sonrası Google yorum kartı ve NFC için kalıcı yorum bağlantısı",
      "Admin iki adımlı doğrulama (TOTP) — Google Authenticator uyumlu; canlıda test OTP kodu tamamen kapatıldı",
      "Ödeme tipleri: yemek kartı (marka kaydı) ve diğer; günlük rapor/CSV dağılımı",
      "Masaüstü/mobil altyapısı: Bearer token API (/api/v1), sürüm kontrolü, cihaz anahtarları, yazdırma ajanı kuyruğu, Realtime ipuçları, PWA ve çevrimdışı sipariş kuyruğu",
      "e-Arşiv/e-Adisyon ve yazar kasa (POS) için entegrasyon altyapısı (entegratör/marka seçimi bekleniyor)",
    ],
  },
  {
    version: "2.2.2",
    date: "Ekim 2026",
    highlights: [
      "Ayarlar → Menü Excel: mevcut menüyü indir, şablonu indir, Excel'den toplu ürün/kategori/varyant yükle (önce önizleme)",
      "Ücretsiz doğrulama: kayıt ve PIN sıfırlama kodları e-posta ile gönderilir (Brevo günde 300 ücretsiz / Resend)",
      "Admin: işletme şifresi görüntüleme ve Groq key kaydı ayrı env gerektirmeden çalışır",
      "Sipariş modu değiştirilemediğinde artık nedeni gösteriliyor (konum şartı)",
    ],
  },
  {
    version: "2.2.1",
    date: "Eylül 2026",
    highlights: [
      "Çok seviyeli admin: ana admin (env key) + alt adminler (key + şifre), admin işlem logları, şifrelenmiş işletme şifresi görüntüleme",
      "Groq API key'i panelden değiştirilebilir (deploy gerekmez), geçersiz yedek AI modelleri düzeltildi",
      "Netgsm SMS altyapısı: OTP, randevu onay/red, randevuya 1 saat kala müşteri hatırlatması",
      "Randevular: Onay Bekleyenler / Bugünün Programı / Yaklaşan + haftalık takvim, çalışma günleri, personel yalnızca kendi randevularını görür",
      "Giriş ekranında rol seçimi, 'Beni hatırla', müşteri PIN sıfırlama (SMS)",
      "Google Maps linkiyle konum, sosyal medya linkleri, 100 m QR menü konum kısıtı",
      "Ödeme penceresi takibi (3 gün önce admin, pencere açılınca işletme SMS + panel bildirimi)",
      "Adisyon: Hazırlanıyor adımı, garson ekranında durum rozetleri, VIP müşteri rozeti, günlük rapor PDF",
      "Güvenlik ve hata düzeltmeleri: oturumsuz şifre sıfırlama, gün sonu saat dilimi, açık yönlendirme, OTP brute-force sınırı",
    ],
  },
  {
    version: "2.0.0",
    date: "25 Temmuz 2026",
    highlights: [
      "Güvenlik: PIN hash, sessionVersion, audit log, idempotency, Redis rate limit, şifre sıfırlama",
      "Gelişmiş tema sistemi (preset + renkler + canlı önizleme)",
      "Çoklu dil altyapısı (TR/EN/ES/DE/RU/AR) ve QR dil seçici + RTL",
      "Kampanya popup/banner, AI menü analizi, müşteri listesi, gider takibi",
      "Kategori görselleri, masa planı alanları, OrderItemStatus, CSV export",
    ],
  },
  {
    version: "1.1.0",
    date: "17 Temmuz 2026",
    highlights: [
      "Berber / kuaför modülü: randevu ızgarası, hizmet süresi, personel müsaitliği",
      "Misafir randevu (isim + telefon), personel seçimi ve müşteri iptali",
      "QR masa sayfasında tam menü (günün önerisi, çok satanlar, AI öneri)",
      "AI kalori/alerjen onay akışı ve menüde kalori rozeti",
      "Admin işletme listesinde tür/durum filtresi",
      "Giriş rate limit ve 30 dk hareketsizlikte otomatik çıkış",
    ],
  },
  {
    version: "1.0.2",
    date: "Temmuz 2026",
    highlights: [
      "Sadakat puanı ve ürün varyantları",
      "Footer, profil, toplu zam, çok satanlar, günün önerisi",
      "Groq AI entegrasyonu ve müşteri sepeti iyileştirmeleri",
    ],
  },
] as const;
