/** İstemci + sunucu ortak randevu yardımcıları (server-only import içermez). */

/** YYYY-MM-DD tarihinin haftanın günü (0=Pazar … 6=Cumartesi). Saf takvim tarihi: saat dilimi etkisiz. */
export function weekdayOfYmd(dateYmd: string): number {
  const [y, m, d] = dateYmd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const ALL_WORK_DAYS = [1, 2, 3, 4, 5, 6, 0];
/** Pzt→Paz sırası, UI için */
export const WEEK_ORDER: { day: number; label: string; short: string }[] = [
  { day: 1, label: "Pazartesi", short: "Pzt" },
  { day: 2, label: "Salı", short: "Sal" },
  { day: 3, label: "Çarşamba", short: "Çar" },
  { day: 4, label: "Perşembe", short: "Per" },
  { day: 5, label: "Cuma", short: "Cum" },
  { day: 6, label: "Cumartesi", short: "Cmt" },
  { day: 0, label: "Pazar", short: "Paz" },
];
