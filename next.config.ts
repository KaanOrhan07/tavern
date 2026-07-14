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
  // Büyük paketlerin import süresini kısaltır
  experimental: {
    optimizePackageImports: ["qrcode"],
  },
};

export default nextConfig;
