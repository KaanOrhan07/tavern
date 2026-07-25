/** Deterministik gelir tahmini — AI zorunlu değil. */

export function weightedRevenueForecast(params: {
  last7DaysAverage: number;
  last4SameWeekdayAverage: number;
  last30DaysAverage: number;
}): { todayKurus: number; weekKurus: number; monthKurus: number } {
  const today = Math.round(
    params.last7DaysAverage * 0.4 +
      params.last4SameWeekdayAverage * 0.4 +
      params.last30DaysAverage * 0.2
  );
  return {
    todayKurus: today,
    weekKurus: today * 7,
    monthKurus: Math.round(params.last30DaysAverage * 30),
  };
}
