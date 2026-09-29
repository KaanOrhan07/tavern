/** Açık yönlendirmeyi (open redirect) engeller: yalnızca site içi mutlak yol kabul edilir. */
export function safeNextPath(next: string | undefined | null, fallback = "/panel/hesabim"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
