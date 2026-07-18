export function ProductNutritionBadges({
  calories,
  allergens,
  vegan = false,
  vegetarian = false,
  glutenFree = false,
  compact = false,
}: {
  calories: number | null;
  allergens: string[];
  vegan?: boolean;
  vegetarian?: boolean;
  glutenFree?: boolean;
  compact?: boolean;
}) {
  const dietLabels: string[] = [];
  if (vegan) dietLabels.push("Vegan");
  else if (vegetarian) dietLabels.push("Vejetaryen");
  if (glutenFree) dietLabels.push("Glutensiz");

  const summaryParts: string[] = [];
  if (calories !== null) summaryParts.push(`${calories} kalori`);
  summaryParts.push(...dietLabels);

  if (summaryParts.length === 0 && allergens.length === 0) return null;

  if (compact) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {calories !== null && (
          <span className="rounded-md bg-ink-soft px-1.5 py-0.5 text-[10px] text-cream-dim">
            {calories} kcal
          </span>
        )}
        {vegan && (
          <span className="rounded-md bg-ok/15 px-1.5 py-0.5 text-[10px] text-ok">🌱 Vegan</span>
        )}
        {!vegan && vegetarian && (
          <span className="rounded-md bg-ok/15 px-1.5 py-0.5 text-[10px] text-ok">
            Vejetaryen
          </span>
        )}
        {glutenFree && (
          <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">
            Glutensiz
          </span>
        )}
        {allergens.length > 0 && (
          <span className="rounded-md bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn">
            ⚠ Alerjen
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-0.5">
      {summaryParts.length > 0 && (
        <p className="text-[11px] text-cream-dim">{summaryParts.join(" · ")}</p>
      )}
      {allergens.length > 0 && (
        <p className="text-[11px] text-warn">Alerjen Malzeme: {allergens.join(", ")}</p>
      )}
    </div>
  );
}
