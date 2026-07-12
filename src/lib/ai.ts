import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil");
  return new GoogleGenAI({ apiKey });
}

/** Gemini'den salt JSON yanıt alır ve parse eder. */
async function askJson<T>(system: string, user: string): Promise<T> {
  const response = await client().models.generateContent({
    model: MODEL,
    contents: user,
    config: {
      systemInstruction: `${system}\nYanıtını YALNIZCA geçerli bir JSON objesi olarak ver. JSON dışında hiçbir metin, açıklama veya kod bloğu işareti ekleme.`,
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "";
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("AI geçerli JSON döndürmedi");
  }
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as T;
}

// --- Kalori / Alerjen ---

export type RecipeInput = { name: string; unit: string; amount: number }[];
export type CalorieResult = { calories: number; allergens: string[] };

export async function estimateCaloriesAndAllergens(
  productName: string,
  recipe: RecipeInput
): Promise<CalorieResult> {
  const list = recipe.map((r) => `- ${r.name}: ${r.amount} ${r.unit}`).join("\n");
  return askJson<CalorieResult>(
    "Sen bir gıda ve beslenme uzmanısın. Verilen reçeteye göre porsiyon başına toplam kaloriyi ve olası alerjenleri Türkçe olarak hesaplarsın.",
    `Ürün: ${productName}\nReçete:\n${list}\n\nŞu formatta yanıt ver: {"calories": <toplam kalori, tam sayı>, "allergens": ["gluten", "süt ürünleri", ...]}. Alerjen yoksa boş dizi döndür. Yaygın alerjenler: gluten, süt ürünleri, yumurta, fındık/fıstık, soya, balık, kabuklu deniz ürünleri, susam, hardal, kereviz.`
  );
}

// --- Satış Tahmini & Stok Önerisi ---

export type SalesHistoryRow = { date: string; productName: string; quantity: number };
export type StockRow = { name: string; unit: string; quantity: number };
export type ForecastResult = {
  summary: string;
  productForecasts: { productName: string; expectedDailySales: number; note: string }[];
  stockWarnings: { ingredientName: string; warning: string }[];
};

export async function forecastSales(
  history: SalesHistoryRow[],
  stock: StockRow[]
): Promise<ForecastResult> {
  return askJson<ForecastResult>(
    "Sen bir restoran işletme analistisin. Geçmiş satış verisine bakarak önümüzdeki günler için talep tahmini ve stok uyarısı üretirsin. Tüm metinler Türkçe olmalı.",
    `Son satış verisi (JSON): ${JSON.stringify(history)}\nMevcut stok (JSON): ${JSON.stringify(stock)}\n\nŞu formatta yanıt ver: {"summary": "genel değerlendirme", "productForecasts": [{"productName": "...", "expectedDailySales": <sayı>, "note": "..."}], "stockWarnings": [{"ingredientName": "...", "warning": "..."}]}`
  );
}

// --- Müşteri Tarafı Akıllı Öneri ---

export type MenuItemForAi = {
  name: string;
  category: string;
  priceTl: string;
  calories: number | null;
  allergens: string[];
};
export type SuggestionResult = {
  suggestions: { productName: string; reason: string }[];
};

export async function suggestProducts(
  menu: MenuItemForAi[],
  customerQuery: string
): Promise<SuggestionResult> {
  return askJson<SuggestionResult>(
    "Sen bir restoran menü asistanısın. Müşterinin isteğine ve alerjilerine göre menüden en uygun 1-3 ürünü önerirsin. Alerjisi olduğu belirtilen alerjeni içeren ürünü ASLA önerme. Tüm metinler Türkçe olmalı.",
    `Menü (JSON): ${JSON.stringify(menu)}\nMüşteri isteği: "${customerQuery}"\n\nŞu formatta yanıt ver: {"suggestions": [{"productName": "menüdeki tam ürün adı", "reason": "kısa öneri gerekçesi"}]}`
  );
}
