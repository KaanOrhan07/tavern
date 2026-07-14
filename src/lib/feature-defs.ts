// Client tarafında da kullanılabilir: yalnızca sabitler, sunucu bağımlılığı yok.
export const FEATURES = [
  { key: "ai_calorie", name: "AI Kalori/Alerjen Hesaplama" },
  { key: "ai_forecast", name: "AI Satış Tahmini & Stok Önerisi" },
  { key: "ai_suggestion", name: "Müşteri Tarafı Akıllı Öneri" },
  { key: "best_sellers", name: "Çok Satanlar Raporu" },
  { key: "stock", name: "Stok & Reçete Sistemi" },
  { key: "staff_requests", name: "Çalışan Talep Sistemi" },
  { key: "kitchen_printer", name: "Mutfak Yazıcısı" },
  { key: "loyalty_points", name: "Sadakat / Puan Sistemi" },
  { key: "product_variants", name: "Ürün Varyantları" },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];
