"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "denied" }
  | { kind: "unavailable" }
  | { kind: "far"; distanceM: number }
  | { kind: "error"; message: string };

/** Menü erişimi için konum doğrulama kapısı (sessiz engelleme yapmaz, her durumu açıklar). */
export function GeoGate({ slug, businessName }: { slug: string; businessName: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  function verify() {
    if (!("geolocation" in navigator)) {
      setState({ kind: "unavailable" });
      return;
    }
    setState({ kind: "checking" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/public/geofence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }),
          });
          const data = await res.json().catch(() => null);
          if (res.ok) {
            router.refresh();
          } else if (res.status === 403 && typeof data?.distanceM === "number") {
            setState({ kind: "far", distanceM: data.distanceM });
          } else {
            setState({ kind: "error", message: data?.error ?? "Doğrulama başarısız" });
          }
        } catch {
          setState({ kind: "error", message: "Bağlantı hatası, tekrar deneyin" });
        }
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? { kind: "denied" } : { kind: "unavailable" }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  }

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md items-center">
      <Card className="w-full space-y-4 p-6 text-center">
        <div className="text-4xl">📍</div>
        <h1 className="text-lg font-semibold">{businessName}</h1>
        <p className="text-sm text-cream-dim">
          Bu menüye yalnızca işletmenin içinden erişilebilir. Devam etmek için konumunu doğrulaman gerekiyor.
        </p>

        {state.kind === "denied" && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Konum izni reddedildi. Tarayıcı adres çubuğundaki kilit simgesinden bu site için konumu &quot;İzin ver&quot;
            olarak değiştirip tekrar dene.
          </p>
        )}
        {state.kind === "unavailable" && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Konum alınamadı. Telefonunun konum (GPS) servisinin açık olduğundan emin ol ve tekrar dene.
          </p>
        )}
        {state.kind === "far" && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            İşletmeden yaklaşık {state.distanceM} m uzaktasın. Menüye yalnızca işletme içinden erişilebilir.
            İşletmedeysen ve konum yanlış görünüyorsa GPS&apos;i açıp tekrar dene.
          </p>
        )}
        {state.kind === "error" && <p className="text-sm text-danger">{state.message}</p>}

        <Button onClick={verify} disabled={state.kind === "checking"} className="w-full">
          {state.kind === "checking" ? "Konum alınıyor..." : "Konumumu Doğrula"}
        </Button>
      </Card>
    </div>
  );
}
