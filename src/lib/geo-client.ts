"use client";

/** Tarayıcıdan konumu alıp sunucuya doğrulatır (taze kanıt çerezi verir). */
export async function verifyLocation(qrToken: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!("geolocation" in navigator)) {
    return { ok: false, message: "Bu cihaz konum özelliğini desteklemiyor" };
  }
  const pos = await new Promise<GeolocationPosition | GeolocationPositionError>((resolve) => {
    navigator.geolocation.getCurrentPosition(resolve, resolve, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0, // önbellekteki eski konum kabul edilmez
    });
  });
  if (!("coords" in pos)) {
    return {
      ok: false,
      message:
        pos.code === pos.PERMISSION_DENIED
          ? "Konum izni verilmedi. Tarayıcı ayarlarından bu site için konumu açın."
          : "Konum alınamadı. GPS'in açık olduğundan emin olun.",
    };
  }
  try {
    const res = await fetch("/api/public/geofence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qrToken,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    if (res.status === 403 && typeof data?.distanceM === "number") {
      return { ok: false, message: `İşletmeden yaklaşık ${data.distanceM} m uzaktasınız. Bu işlem yalnızca işletme içinden yapılabilir.` };
    }
    return { ok: false, message: data?.error ?? "Konum doğrulanamadı" };
  } catch {
    return { ok: false, message: "Bağlantı hatası, tekrar deneyin" };
  }
}

/**
 * Sipariş/garson çağır/hesap iste isteği: sunucu "konum doğrula" (geoRequired) derse
 * konumu yeniler ve isteği bir kez yeniden dener.
 */
export async function fetchWithGeo(
  qrToken: string,
  input: string,
  init: RequestInit
): Promise<{ res: Response; geoMessage?: string }> {
  const first = await fetch(input, init);
  if (first.status !== 403) return { res: first };
  const data = await first.clone().json().catch(() => null);
  if (!data?.geoRequired || data.reason !== "verify") return { res: first };

  const proof = await verifyLocation(qrToken);
  if (!proof.ok) return { res: first, geoMessage: proof.message };
  return { res: await fetch(input, init) };
}
