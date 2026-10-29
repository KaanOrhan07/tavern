/**
 * AB (EU 1169/2011) 14 standart alerjen. Müşteriye gösterilen, işletmenin onayladığı alerjen listesi
 * bu anahtarlarla tutulur (Product.allergenKeys). Eski serbest metin (Product.allergens) alias'larla eşlenir.
 */
export const ALLERGEN_KEYS = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "treenuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;

export type AllergenKey = (typeof ALLERGEN_KEYS)[number];
export type AllergenLocale = "TR" | "EN" | "DE" | "ES" | "RU" | "AR";

type AllergenDef = {
  icon: string;
  labels: Record<AllergenLocale, string>;
  /** Serbest metin (AI çıktısı / eski veri) eşleştirme: küçük harf, aksansız parçalar */
  aliases: string[];
};

export const ALLERGENS: Record<AllergenKey, AllergenDef> = {
  gluten: {
    icon: "🌾",
    labels: {
      TR: "Gluten içeren tahıllar",
      EN: "Cereals containing gluten",
      DE: "Glutenhaltiges Getreide",
      ES: "Cereales con gluten",
      RU: "Злаки, содержащие глютен",
      AR: "الحبوب المحتوية على الغلوتين",
    },
    aliases: ["gluten", "bugday", "wheat", "arpa", "barley", "cavdar", "rye", "yulaf", "oat", "makarna", "ekmek", "un"],
  },
  crustaceans: {
    icon: "🦐",
    labels: {
      TR: "Kabuklu deniz ürünleri",
      EN: "Crustaceans",
      DE: "Krebstiere",
      ES: "Crustáceos",
      RU: "Ракообразные",
      AR: "القشريات",
    },
    aliases: ["kabuklu", "crustacean", "karides", "shrimp", "prawn", "yengec", "crab", "istakoz", "lobster"],
  },
  eggs: {
    icon: "🥚",
    labels: { TR: "Yumurta", EN: "Eggs", DE: "Eier", ES: "Huevos", RU: "Яйца", AR: "البيض" },
    aliases: ["yumurta", "egg"],
  },
  fish: {
    icon: "🐟",
    labels: { TR: "Balık", EN: "Fish", DE: "Fisch", ES: "Pescado", RU: "Рыба", AR: "السمك" },
    aliases: ["balik", "fish", "somon", "salmon", "ton", "tuna", "hamsi", "levrek"],
  },
  peanuts: {
    icon: "🥜",
    labels: { TR: "Yer fıstığı", EN: "Peanuts", DE: "Erdnüsse", ES: "Cacahuetes", RU: "Арахис", AR: "الفول السوداني" },
    aliases: ["yer fistigi", "fistik", "peanut"],
  },
  soy: {
    icon: "🫘",
    labels: { TR: "Soya", EN: "Soy", DE: "Soja", ES: "Soja", RU: "Соя", AR: "الصويا" },
    aliases: ["soya", "soy"],
  },
  milk: {
    icon: "🥛",
    labels: {
      TR: "Süt ve süt ürünleri (laktoz dahil)",
      EN: "Milk (including lactose)",
      DE: "Milch (einschließlich Laktose)",
      ES: "Leche (incluida la lactosa)",
      RU: "Молоко (включая лактозу)",
      AR: "الحليب (بما في ذلك اللاكتوز)",
    },
    aliases: ["sut", "milk", "laktoz", "lactose", "peynir", "cheese", "tereyag", "butter", "krema", "cream", "yogurt", "kaymak"],
  },
  treenuts: {
    icon: "🌰",
    labels: {
      TR: "Sert kabuklu yemişler (fındık, badem, ceviz…)",
      EN: "Tree nuts (hazelnut, almond, walnut…)",
      DE: "Schalenfrüchte (Haselnuss, Mandel, Walnuss…)",
      ES: "Frutos de cáscara (avellana, almendra, nuez…)",
      RU: "Орехи (фундук, миндаль, грецкий орех…)",
      AR: "المكسرات (البندق، اللوز، الجوز…)",
    },
    aliases: ["findik", "hazelnut", "badem", "almond", "ceviz", "walnut", "antep", "pistachio", "kaju", "cashew", "pekan", "pecan", "sert kabuklu", "nuts"],
  },
  celery: {
    icon: "🥬",
    labels: { TR: "Kereviz", EN: "Celery", DE: "Sellerie", ES: "Apio", RU: "Сельдерей", AR: "الكرفس" },
    aliases: ["kereviz", "celery"],
  },
  mustard: {
    icon: "🟡",
    labels: { TR: "Hardal", EN: "Mustard", DE: "Senf", ES: "Mostaza", RU: "Горчица", AR: "الخردل" },
    aliases: ["hardal", "mustard"],
  },
  sesame: {
    icon: "⚪",
    labels: { TR: "Susam", EN: "Sesame", DE: "Sesam", ES: "Sésamo", RU: "Кунжут", AR: "السمسم" },
    aliases: ["susam", "sesame", "tahin", "tahini"],
  },
  sulphites: {
    icon: "🍷",
    labels: {
      TR: "Sülfitler (kükürt dioksit)",
      EN: "Sulphites (sulphur dioxide)",
      DE: "Sulfite (Schwefeldioxid)",
      ES: "Sulfitos (dióxido de azufre)",
      RU: "Сульфиты (диоксид серы)",
      AR: "الكبريتيت (ثاني أكسيد الكبريت)",
    },
    aliases: ["sulfit", "sulphite", "sulfite", "kukurt", "sulphur"],
  },
  lupin: {
    icon: "🌼",
    labels: { TR: "Acı bakla (lupin)", EN: "Lupin", DE: "Lupinen", ES: "Altramuces", RU: "Люпин", AR: "الترمس" },
    aliases: ["lupin", "aci bakla"],
  },
  molluscs: {
    icon: "🦪",
    labels: { TR: "Yumuşakçalar (midye, kalamar…)", EN: "Molluscs (mussels, squid…)", DE: "Weichtiere (Muscheln, Tintenfisch…)", ES: "Moluscos (mejillones, calamares…)", RU: "Моллюски (мидии, кальмары…)", AR: "الرخويات (بلح البحر، الحبار…)" },
    aliases: ["yumusakca", "mollusc", "midye", "mussel", "kalamar", "squid", "ahtapot", "octopus", "istiridye", "oyster"],
  },
};

export function isAllergenKey(v: string): v is AllergenKey {
  return (ALLERGEN_KEYS as readonly string[]).includes(v);
}

function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Serbest metin alerjen adlarını (ör. AI çıktısı "Süt", "Fıstık") AB-14 anahtarlarına çevirir. */
export function mapAllergenText(texts: string[]): AllergenKey[] {
  const found = new Set<AllergenKey>();
  for (const raw of texts) {
    const t = fold(raw);
    if (!t) continue;
    if (isAllergenKey(t)) {
      found.add(t);
      continue;
    }
    for (const key of ALLERGEN_KEYS) {
      const def = ALLERGENS[key];
      if (def.aliases.some((a) => (a.length <= 3 ? t === a : t.includes(a)))) found.add(key);
    }
  }
  return ALLERGEN_KEYS.filter((k) => found.has(k));
}

export function allergenLabel(key: string, locale: string = "TR"): string {
  if (!isAllergenKey(key)) return key;
  const l = (ALLERGENS[key].labels as Record<string, string>)[locale.toUpperCase()];
  return l ?? ALLERGENS[key].labels.TR;
}

export function allergenIcon(key: string): string {
  return isAllergenKey(key) ? ALLERGENS[key].icon : "⚠";
}

/** Menüde varsayılan uyarı notu (işletme kendi metnini yazabilir). */
export const DEFAULT_ALLERGEN_NOTE: Record<AllergenLocale, string> = {
  TR: "İçerik ve alerjen bilgileri bilgilendirme amaçlıdır. Alerjiniz veya hassasiyetiniz varsa sipariş vermeden önce mutlaka personele bildirin.",
  EN: "Ingredient and allergen information is provided for guidance. If you have an allergy or intolerance, please tell our staff before ordering.",
  DE: "Zutaten- und Allergeninformationen dienen der Orientierung. Bei Allergien oder Unverträglichkeiten informieren Sie bitte vor der Bestellung unser Personal.",
  ES: "La información de ingredientes y alérgenos es orientativa. Si tiene alergias o intolerancias, avise al personal antes de pedir.",
  RU: "Информация о составе и аллергенах носит справочный характер. При аллергии или непереносимости сообщите персоналу до заказа.",
  AR: "معلومات المكونات ومسببات الحساسية إرشادية. إذا كان لديك حساسية، يرجى إبلاغ الموظفين قبل الطلب.",
};

const ALCOHOL_WORDS = [
  "sarap", "wine", "bira", "beer", "raki", "viski", "whisky", "whiskey", "votka", "vodka", "cin", "gin", "rom", "rum",
  "likor", "liqueur", "tekila", "tequila", "konyak", "cognac", "brandy", "sampanya", "champagne", "alkol", "alcohol",
  "kokteyl", "cocktail", "aperol", "bourbon", "sake", "mezcal", "vermut", "vermouth",
];
const PORK_WORDS = ["domuz", "pork", "jambon", "ham", "bacon", "bekon", "prosciutto", "pepperoni", "pancetta", "chorizo", "guanciale"];

/**
 * Reçete malzeme adlarından alkol / domuz ÖNERİSİ üretir (karar işletmeye aittir).
 * Kelime bazlı eşleşir ("cin" gibi kısa kelimeler başka kelimelerin içinde sayılmaz).
 */
export function suggestFlagsFromIngredients(names: string[]): { alcohol: string[]; pork: string[] } {
  const alcohol = new Set<string>();
  const pork = new Set<string>();
  for (const name of names) {
    const tokens = fold(name).split(/[^a-z0-9]+/).filter(Boolean);
    if (tokens.some((t) => ALCOHOL_WORDS.includes(t))) alcohol.add(name);
    if (tokens.some((t) => PORK_WORDS.includes(t))) pork.add(name);
  }
  return { alcohol: [...alcohol], pork: [...pork] };
}
