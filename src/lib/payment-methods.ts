/** Ödeme tipleri — istemci + sunucu ortak. */
export const PAYMENT_METHODS = ["CASH", "CARD", "MEAL_CARD", "OTHER"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodValue, string> = {
  CASH: "Nakit",
  CARD: "Kredi/Banka Kartı",
  MEAL_CARD: "Yemek Kartı",
  OTHER: "Diğer",
};

/** Yemek kartı markaları (şimdilik yalnızca KAYIT; sağlayıcı entegrasyonu sonraki aşama). */
export const MEAL_CARD_BRANDS = [
  "Multinet",
  "Sodexo",
  "Edenred (Ticket)",
  "Metropol",
  "SetCard",
  "Paye Kart",
  "Diğer yemek kartı",
] as const;

export const OTHER_PAYMENT_HINTS = ["Havale/EFT", "Çek/Senet", "İkram", "Diğer"] as const;
