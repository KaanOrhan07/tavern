export const RELEASE_NOTES = [
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
