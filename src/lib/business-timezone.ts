/** Türkiye işletmeleri için varsayılan saat dilimi. */
export const DEFAULT_BUSINESS_TZ = "Europe/Istanbul";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour") % 24,
    minute: pick("minute"),
  };
}

export function formatDateInTz(date: Date, timeZone = DEFAULT_BUSINESS_TZ): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function todayYmdInTz(timeZone = DEFAULT_BUSINESS_TZ): string {
  return formatDateInTz(new Date(), timeZone);
}

export function minutesToHm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addDaysYmd(dateYmd: string, days: number): string {
  const [y, mo, d] = dateYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Yerel YYYY-MM-DD + HH:mm → UTC Date (işletme saat diliminde). */
export function zonedLocalToUtc(
  dateYmd: string,
  hm: string,
  timeZone = DEFAULT_BUSINESS_TZ
): Date {
  const [y, mo, d] = dateYmd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const targetMin = h * 60 + mi;

  let utcMs = Date.UTC(y, mo - 1, d, h, mi, 0);
  for (let attempt = 0; attempt < 5; attempt++) {
    const p = zonedParts(new Date(utcMs), timeZone);
    let actualMin = p.hour * 60 + p.minute;
    if (p.year !== y || p.month !== mo || p.day !== d) {
      const dayDiff = Math.round(
        (Date.UTC(y, mo - 1, d) - Date.UTC(p.year, p.month - 1, p.day)) / 86_400_000
      );
      actualMin += dayDiff * 24 * 60;
    }
    const diffMin = targetMin - actualMin;
    if (diffMin === 0) break;
    utcMs += diffMin * 60_000;
  }
  return new Date(utcMs);
}
