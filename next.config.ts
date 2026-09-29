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
  // Büyük paketlerin import süresini kısaltır
  experimental: {
    optimizePackageImports: ["qrcode"],
  },
};

export default nextConfig;
