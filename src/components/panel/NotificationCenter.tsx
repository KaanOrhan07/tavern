"use client";

import { useEffect, useRef, useState } from "react";
import { isPrinterConnected, printKitchenTicket } from "@/lib/printer";

type Notification = {
  id: string;
  type: "NEW_ORDER" | "NEW_REQUEST";
  message: string;
  readAt: string | null;
  createdAt: string;
};

function parseTableName(message: string): string | null {
  const match = message.match(/^(.+): yeni sipariş/);
  return match?.[1]?.trim() ?? null;
}

/** Web Audio ile kısa, iki tonlu bir uyarı sesi çalar (ses dosyası gerekmez). */
function playChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1174.66].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.15);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.15 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.45);
  });
}

const POLL_INTERVAL_MS = 15_000;

/**
 * PanelShell, bildirim çanını aynı anda hem mobil hem masaüstü başlıkta render eder
 * (hangisi görünür olacağı CSS ile seçilir). Bu yüzden birden fazla NotificationCenter
 * aynı anda mount olabilir. Ağ isteğini ve — daha önemlisi — mutfak fişi yazdırmayı
 * tekilleştirmek için modül seviyesinde tek bir "kaynak" (leader) poll döngüsü tutulur;
 * tüm mount'lar sadece bu döngünün sonucuna abone olur.
 */
type Listener = (items: Notification[]) => void;
const listeners = new Set<Listener>();
const audioContexts = new Set<AudioContext>();
let printerEnabledRef = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let knownIds: Set<string> | null = null;
const printedIds = new Set<string>();

/** Birden fazla mount olsa da uyarı sesi tek bir cihazdan yalnızca bir kez çalınır. */
function chimeOnce() {
  for (const ctx of audioContexts) {
    if (ctx.state === "running") {
      playChime(ctx);
      return;
    }
  }
}

async function pollOnce() {
  try {
    const res = await fetch("/api/panel/notifications");
    if (!res.ok) return;
    const data: { notifications: Notification[] } = await res.json();
    const fresh = data.notifications;

    if (knownIds !== null) {
      const newOnes = fresh.filter((n) => !knownIds!.has(n.id));
      if (newOnes.length > 0) chimeOnce();

      if (printerEnabledRef && isPrinterConnected()) {
        for (const n of newOnes) {
          if (n.type !== "NEW_ORDER" || printedIds.has(n.id)) continue;
          const tableName = parseTableName(n.message);
          if (!tableName) continue;

          printedIds.add(n.id);
          try {
            const since = new Date(
              new Date(n.createdAt).getTime() - 60_000
            ).toISOString();
            const ticketRes = await fetch(
              `/api/panel/kitchen-ticket?tableName=${encodeURIComponent(tableName)}&since=${encodeURIComponent(since)}`
            );
            if (!ticketRes.ok) {
              printedIds.delete(n.id);
              continue;
            }
            const ticket = await ticketRes.json();
            await printKitchenTicket({
              tableName: ticket.tableName,
              items: ticket.items,
              time: new Date(n.createdAt),
            });
          } catch {
            printedIds.delete(n.id);
          }
        }
      }
    }
    knownIds = new Set(fresh.map((n) => n.id));
    listeners.forEach((l) => l(fresh));
  } catch {
    // ağ hatasında sessizce geç
  }
}

function subscribe(listener: Listener) {
  const isFirst = listeners.size === 0;
  listeners.add(listener);
  if (isFirst) {
    pollOnce();
    pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
      knownIds = null;
    }
  };
}

export function NotificationCenter({
  printerEnabled = false,
}: {
  printerEnabled?: boolean;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // En son değeri paylaşılan poll döngüsüne yansıt (component-özel değil, global durum)
  printerEnabledRef = printerEnabled;

  useEffect(() => {
    function unlock() {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
        audioContexts.add(audioCtxRef.current);
      }
      audioCtxRef.current.resume();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      if (audioCtxRef.current) {
        audioContexts.delete(audioCtxRef.current);
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  useEffect(() => subscribe(setItems), []);

  const unread = items.filter((n) => !n.readAt).length;

  async function markAllRead() {
    if (unread === 0) return;
    await fetch("/api/panel/notifications", { method: "PATCH" });
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Bildirimler"
        onClick={() => {
          setOpen(!open);
          if (!open) markAllRead();
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-ink-card cursor-pointer"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-cream"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-ink-line bg-ink-card shadow-xl">
            <p className="border-b border-ink-line px-4 py-3 text-sm font-medium">
              Bildirimler
            </p>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-cream-dim">
                  Bildirim yok
                </p>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-ink-line/50 px-4 py-3 last:border-0 ${
                      !n.readAt ? "bg-gold/5" : ""
                    }`}
                  >
                    <p className="text-sm">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-cream-dim">
                      {new Date(n.createdAt).toLocaleString("tr-TR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
