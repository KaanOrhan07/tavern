import { allergenIcon, allergenLabel, DEFAULT_ALLERGEN_NOTE, type AllergenLocale } from "@/lib/allergens";

/** Kısa rozet etiketi: parantez sonrası açıklama atılır ("Süt ve süt ürünleri (laktoz dahil)" → "Süt ve süt ürünleri"). */
const short = (label: string) => label.split(" (")[0]!;

export function ProductNutritionBadges({
  calories,
  allergens,
  allergenKeys = [],
  containsAlcohol = false,
  containsPork = false,
  vegan = false,
  vegetarian = false,
  glutenFree = false,
  compact = false,
  locale = "TR",
}: {
  calories: number | null;
  allergens: string[];
  allergenKeys?: string[];
  containsAlcohol?: boolean;
  containsPork?: boolean;
  vegan?: boolean;
  vegetarian?: boolean;
  glutenFree?: boolean;
  compact?: boolean;
  locale?: string;
}) {
  const dietLabels: string[] = [];
  if (vegan) dietLabels.push("Vegan");
  else if (vegetarian) dietLabels.push("Vejetaryen");
  if (glutenFree) dietLabels.push("Glutensiz");

  const summaryParts: string[] = [];
  if (calories !== null) summaryParts.push(`${calories} kalori`);
  summaryParts.push(...dietLabels);

  // AB-14 anahtarları varsa onlar; yoksa eski serbest metin
  const hasAllergens = allergenKeys.length > 0 || allergens.length > 0;

  if (summaryParts.length === 0 && !hasAllergens && !containsAlcohol && !containsPork) return null;

  if (compact) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {calories !== null && (
          <span className="rounded-md bg-ink-soft px-1.5 py-0.5 text-[10px] text-cream-dim">{calories} kcal</span>
        )}
        {vegan && <span className="rounded-md bg-ok/15 px-1.5 py-0.5 text-[10px] text-ok">🌱 Vegan</span>}
        {!vegan && vegetarian && (
          <span className="rounded-md bg-ok/15 px-1.5 py-0.5 text-[10px] text-ok">Vejetaryen</span>
        )}
        {glutenFree && <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">Glutensiz</span>}
        {containsAlcohol && (
          <span className="rounded-md bg-danger/15 px-1.5 py-0.5 text-[10px] text-danger">🍷 Alkol</span>
        )}
        {containsPork && (
          <span className="rounded-md bg-danger/15 px-1.5 py-0.5 text-[10px] text-danger">🐖 Domuz</span>
        )}
        {allergenKeys.length > 0 ? (
          <span
            className="rounded-md bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn"
            title={allergenKeys.map((k) => allergenLabel(k, locale)).join(", ")}
          >
            ⚠ {allergenKeys.slice(0, 4).map(allergenIcon).join("")}
            {allergenKeys.length > 4 ? ` +${allergenKeys.length - 4}` : ""}
          </span>
        ) : (
          allergens.length > 0 && (
            <span className="rounded-md bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn">⚠ Alerjen</span>
          )
        )}
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-0.5">
      {summaryParts.length > 0 && <p className="text-[11px] text-cream-dim">{summaryParts.join(" · ")}</p>}
      {(containsAlcohol || containsPork) && (
        <p className="text-[11px] text-danger">
          {[containsAlcohol ? "🍷 Alkol içerir" : null, containsPork ? "🐖 Domuz ürünü içerir" : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {allergenKeys.length > 0 ? (
        <p className="text-[11px] text-warn">
          Alerjenler: {allergenKeys.map((k) => `${allergenIcon(k)} ${short(allergenLabel(k, locale))}`).join(", ")}
        </p>
      ) : (
        allergens.length > 0 && <p className="text-[11px] text-warn">Alerjen Malzeme: {allergens.join(", ")}</p>
      )}
    </div>
  );
}

/** Menüde gösterilen alerjen/içerik uyarı notu (işletme özel metin girebilir). */
export function AllergenNote({ note, locale = "TR" }: { note: string | null; locale?: string }) {
  const text = note?.trim() || DEFAULT_ALLERGEN_NOTE[(locale.toUpperCase() as AllergenLocale)] || DEFAULT_ALLERGEN_NOTE.TR;
  return (
    <p className="rounded-xl border border-ink-line bg-ink-card px-3.5 py-2.5 text-[11px] leading-relaxed text-cream-dim">
      ⚠ {text}
    </p>
  );
}
