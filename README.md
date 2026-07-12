# Tavern

**Manage. Grow. Thrive.**

Çok kiracılı (multi-tenant) işletme yönetim SaaS platformu. İlk modül: Restoran/Kafe.
DIGIO tarafından geliştirilmektedir.

## Teknoloji

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma 7 + PostgreSQL (Supabase)
- Supabase Storage (ürün fotoğrafları, `sharp` ile sıkıştırma)
- Google Gemini API (kalori/alerjen, satış tahmini, ürün önerisi)
- Web Bluetooth/USB ile ESC/POS mutfak yazıcısı

## Kurulum

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. `.env.example` dosyasını `.env` olarak kopyalayın ve değerleri doldurun:
   - **Supabase:** proje oluşturun, `DATABASE_URL` (transaction pooler) ve `DIRECT_URL` (direct connection) değerlerini girin. Storage'da `product-images` adında **public** bir bucket oluşturun.
   - **ADMIN_KEY:** admin girişi için uzun rastgele bir anahtar belirleyin.
   - **AUTH_SECRET:** en az 32 karakter rastgele bir değer.
   - **GEMINI_API_KEY:** Google AI Studio'dan alınan Gemini API anahtarı (AI özellikleri için).

3. Veritabanını hazırlayın:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

4. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

## Giriş Noktaları

| Rol | URL | Giriş |
| --- | --- | --- |
| Admin | `/admin/giris` | `ADMIN_KEY` ile |
| İşletme Sahibi | `/panel/{slug}/giris` | E-posta + şifre |
| Garson/Personel | `/panel/{slug}/giris` | 4-6 haneli PIN |
| Müşteri | `/{slug}/menu` ve `/{slug}/masa/{qrToken}` | Kimliksiz (QR) |

## Akış Özeti

1. Admin, panelden işletme oluşturur (sahip hesabıyla birlikte) ve özellik bayraklarını yönetir.
2. İşletme sahibi girer: kategoriler, ürünler (fotoğraf + reçete zorunlu), malzemeler, masalar ve personel PIN'lerini tanımlar.
3. Sipariş modu seçilir: **Sadece Garson** veya **Müşteri QR** (aynı anda tek mod).
4. Siparişler girildikçe stok reçeteye göre otomatik düşer; kalem silinirse iade edilir.
5. Ödeme nakit/kart olarak işaretlenir (gerçek ödeme entegrasyonu yok); kısmi ödeme desteklenir, tüm kalemler ödenince masa otomatik kapanır.
6. Mutfak yazıcısı bağlıysa her siparişte hazırlık fişi basılır (Chrome/Edge gerekir).

## Notlar

- Kod İngilizce, tüm arayüz Türkçe'dir.
- Para birimleri kuruş cinsinden tam sayı olarak saklanır.
- AI kalori/alerjen bilgisi, işletme onaylamadan müşteriye gösterilmez.
- Web Bluetooth iOS Safari'de desteklenmez; yazıcı için Chrome/Edge kullanın.
