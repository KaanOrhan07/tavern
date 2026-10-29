import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Harici ürün fotoğrafları (Supabase Storage) için
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  // Günlük rapor PDF'i için gömülü Türkçe font dosyaları serverless paketine dahil edilir
  outputFileTracingIncludes: {
    "/api/panel/reports/daily-pdf": ["./src/assets/fonts/**"],
    // sharp (görsel yükleme) Vercel'de harici modül olarak çalışır; Turbopack izlemesi
    // libvips native .so dosyasını fonksiyona kopyalamadığı için Linux'ta dlopen hatası
    // veriyordu. Linux-x64 native paketlerini tüm yükleme (API) rotalarına zorla dahil et.
    // (Windows/mac build'inde bu klasörler yok; glob boş eşleşir, sorun olmaz.)
    "/api/**": [
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
  // Service worker: her zaman güncel kontrol edilsin; kapsam /panel/
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/panel/" },
        ],
      },
    ];
  },
  // Büyük paketlerin import süresini kısaltır
  experimental: {
    optimizePackageImports: ["qrcode"],
  },
};

export default nextConfig;
