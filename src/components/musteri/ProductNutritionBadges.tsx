/** Müşteri menüsünde kalori ve alerjen rozetleri (onaylanmış bilgiler). */
export function ProductNutritionBadges({
  calories,
  allergens,
}: {
  calories: number | null;
  allergens: string[];
}) {
  if (calories === null && allergens.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5">
      {calories !== null && (
        <p className="text-[11px] text-cream-dim">~{calories} kcal</p>
      )}
      {allergens.length > 0 && (
        <p className="text-[11px] text-warn">⚠ {allergens.join(", ")}</p>
      )}
    </div>
  );
}
