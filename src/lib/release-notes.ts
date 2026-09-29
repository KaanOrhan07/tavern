export const RELEASE_NOTES = [
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
