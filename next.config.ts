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
