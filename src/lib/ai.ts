const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b"];
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000;

function modelCandidates(): string[] {
  const preferred = process.env.GROQ_MODEL?.trim();
  const seen = new Set<string>();
  const models: string[] = [];
  for (const model of [preferred, DEFAULT_MODEL, ...FALLBACK_MODELS]) {
    if (!model || seen.has(model)) continue;
    seen.add(model);
    models.push(model);
  }
  return models;
}

function shouldTryNextModel(status: number, body: string): boolean {
  if (status !== 400 && status !== 404) return false;
  const lower = body.toLowerCase();
  return (
    lower.includes("json_validate_failed") ||
    (lower.includes("model") &&
      (lower.includes("decommission") ||
        lower.includes("not found") ||
        lower.includes("not supported") ||
        lower.includes("deprecated")))
  );
}

/** Groq'tan (OpenAI uyumlu Chat Completions API) salt JSON yanıt alır ve parse eder. */
async function askJson<T>(system: string, user: string): Promise<T> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY tanımlı değil");

  let lastError = "Groq API hatası";

  for (const model of modelCandidates()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `${system}\nYanıtını YALNIZCA geçerli bir JSON objesi olarak ver. JSON dışında hiçbir metin, açıklama veya kod bloğu işareti ekleme.`,
            },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === "AbortError") {
        console.error(`[ai] Groq isteği zaman aşımına uğradı (model: ${model})`);
        throw new Error("AI yanıt vermedi, tekrar deneyin");
      }
      console.error(`[ai] Groq isteği başarısız (ağ hatası, model: ${model}):`, e);
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[ai] Groq isteği başarısız (${res.status}, model: ${model}):`, body);
      lastError = `Groq API hatası: ${res.status}`;
      if (shouldTryNextModel(res.status, body)) continue;
      throw new Error(lastError);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error(`[ai] Groq geçerli JSON döndürmedi (model: ${model}). Ham yanıt:`, text);
      lastError = "AI geçerli JSON döndürmedi";
      continue;
    }

    try {
      return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as T;
    } catch (e) {
      console.error(`[ai] JSON parse hatası (model: ${model}):`, e);
      lastError = "AI geçerli JSON döndürmedi";
    }
  }

  throw new Error(lastError);
}

// --- Kalori / Alerjen ---

export type RecipeInput = { name: string; unit: string; amount: number }[];
export type CalorieResult = { calories: number; allergens: string[] };

function normalizeCalorieResult(raw: CalorieResult): CalorieResult {
  const calories = Math.max(0, Math.round(Number(raw.calories)));
  const allergens = Array.isArray(raw.allergens)
    ? [...new Set(raw.allergens.map((a) => String(a).trim()).filter(Boolean))]
    : [];
  if (!Number.isFinite(calories)) {
    throw new Error("AI geçersiz kalori değeri döndürdü");
  }
  return { calories, allergens };
}

export async function estimateCaloriesAndAllergens(
  productName: string,
  recipe: RecipeInput
): Promise<CalorieResult> {
  const list = recipe.map((r) => `- ${r.name}: ${r.amount} ${r.unit}`).join("\n");
  const result = await askJson<CalorieResult>(
    "Sen bir gıda ve beslenme uzmanısın. Verilen reçeteye göre porsiyon başına toplam kaloriyi ve olası alerjenleri Türkçe olarak hesaplarsın.",
    `Ürün: ${productName}\nReçete:\n${list}\n\nŞu formatta yanıt ver: {"calories": <toplam kalori, tam sayı>, "allergens": ["gluten", "süt ürünleri", ...]}. Alerjen yoksa boş dizi döndür. Yaygın alerjenler: gluten, süt ürünleri, yumurta, fındık/fıstık, soya, balık, kabuklu deniz ürünleri, susam, hardal, kereviz.`
  );
  return normalizeCalorieResult(result);
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
  const result = await askJson<ForecastResult>(
    "Sen bir restoran işletme analistisin. Geçmiş satış verisine bakarak önümüzdeki günler için talep tahmini ve stok uyarısı üretirsin. Tüm metinler Türkçe olmalı.",
    `Son satış verisi (JSON): ${JSON.stringify(history)}\nMevcut stok (JSON): ${JSON.stringify(stock)}\n\nŞu formatta yanıt ver: {"summary": "genel değerlendirme", "productForecasts": [{"productName": "...", "expectedDailySales": <sayı>, "note": "..."}], "stockWarnings": [{"ingredientName": "...", "warning": "..."}]}`
  );
  return {
    summary: String(result.summary ?? ""),
    productForecasts: Array.isArray(result.productForecasts) ? result.productForecasts : [],
    stockWarnings: Array.isArray(result.stockWarnings) ? result.stockWarnings : [],
  };
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
  const exactNames = menu.map((m) => m.name).join("\n- ");
  const result = await askJson<SuggestionResult>(
    "Sen bir restoran menü asistanısın. Müşterinin isteğine ve alerjilerine göre menüden en uygun 1-3 ürünü önerirsin. Alerjisi olduğu belirtilen alerjeni içeren ürünü ASLA önerme. Tüm metinler Türkçe olmalı.",
    `Menü (JSON): ${JSON.stringify(menu)}\n\nMenüdeki ürün adları (productName alanında AYNEN bunlardan birini kullan):\n- ${exactNames}\n\nMüşteri isteği: "${customerQuery}"\n\nŞu formatta yanıt ver: {"suggestions": [{"productName": "menüdeki tam ürün adı", "reason": "kısa öneri gerekçesi"}]}`
  );
  return {
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
  };
}
