"use client";

import { useState } from "react";
import { fetchWithGeo } from "@/lib/geo-client";

export function CallWaiterButton({ qrToken }: { qrToken: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function callWaiter() {
    if (status === "sending") return;
    setStatus("sending");
    const { res, geoMessage } = await fetchWithGeo(qrToken, "/api/public/call-waiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    });
    if (!res.ok && geoMessage) alert(geoMessage);
    setStatus(res.ok ? "sent" : "idle");
    if (res.ok) {
      setTimeout(() => setStatus("idle"), 15_000);
    }
  }

  return (
    <button
      type="button"
      onClick={callWaiter}
      disabled={status !== "idle"}
      className={`shrink-0 rounded-lg border px-3.5 py-2.5 text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed ${
        status === "sent"
          ? "border-ok/40 bg-ok/10 text-ok"
          : "border-ink-line text-cream-dim hover:text-cream"
      }`}
    >
      {status === "sending" ? "Çağrılıyor..." : status === "sent" ? "Garson geliyor ✓" : "🛎 Garson Çağır"}
    </button>
  );
}
