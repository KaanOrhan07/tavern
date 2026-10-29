"use client";

import { useEffect, useState } from "react";
import { QUEUE_EVENT, clearFailed, flushQueue, readFailed, readQueue } from "@/lib/offline-queue";

/**
 * Panel çevrimdışı desteği: service worker kaydı + bekleyen işlem sayacı + bağlantı gelince otomatik gönderim.
 * Çevrimdışıyken girilen siparişler tarayıcıda saklanır; internet gelince Idempotency-Key ile bir kez uygulanır.
 */
export function PanelOfflineSupport() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState<{ label: string; error: string }[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/panel/" }).catch(() => undefined);
    }

    const refresh = () => {
      setPending(readQueue().length);
      setFailed(readFailed().map((f) => ({ label: f.label, error: f.error })));
    };
    const flush = async () => {
      if (readQueue().length === 0) return;
      const r = await flushQueue();
      if (r.sent > 0) setFlash(`${r.sent} bekleyen işlem gönderildi ✓`);
      refresh();
    };
    const onOnline = () => {
      setOnline(true);
      void flush();
    };
    const onOffline = () => setOnline(false);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcı API'leri (navigator/localStorage) yalnızca mount sonrası okunabilir
    setOnline(navigator.onLine);
    refresh();
    void flush();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(QUEUE_EVENT, refresh);
    const timer = setInterval(() => void flush(), 20_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(QUEUE_EVENT, refresh);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  if (online && pending === 0 && failed.length === 0 && !flash) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 space-y-1 p-2 text-center text-sm">
      {!online && (
        <div className="mx-auto max-w-xl rounded-lg border border-warn/50 bg-ink-soft px-3 py-2 text-warn shadow-lg">
          ⚠ Çevrimdışısınız — siparişler kaydedilir, bağlantı gelince otomatik gönderilir
          {pending > 0 && ` (${pending} bekliyor)`}
        </div>
      )}
      {online && pending > 0 && (
        <div className="mx-auto max-w-xl rounded-lg border border-gold/50 bg-ink-soft px-3 py-2 text-gold shadow-lg">
          {pending} işlem gönderiliyor…
        </div>
      )}
      {flash && (
        <div className="mx-auto max-w-xl rounded-lg border border-ok/50 bg-ink-soft px-3 py-2 text-ok shadow-lg">{flash}</div>
      )}
      {failed.length > 0 && (
        <div className="mx-auto max-w-xl rounded-lg border border-danger/50 bg-ink-soft px-3 py-2 text-danger shadow-lg">
          <p className="font-medium">Gönderilemeyen işlemler:</p>
          <ul className="mt-1 text-xs">
            {failed.map((f, i) => (
              <li key={i}>
                {f.label}: {f.error}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              clearFailed();
              setFailed([]);
            }}
            className="mt-1 text-xs underline"
          >
            Tamam, kapat
          </button>
        </div>
      )}
    </div>
  );
}
