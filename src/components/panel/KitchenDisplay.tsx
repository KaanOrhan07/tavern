"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addNotificationAudioContext,
  playNotificationChimeOnce,
  removeNotificationAudioContext,
} from "@/lib/notification-chime";

type KitchenItem = {
  id: string;
  tableName: string;
  productName: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  preparedAt: string | null;
};

const POLL_MS = 8_000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KitchenCard({
  item,
  done,
  onMarkPrepared,
  marking,
}: {
  item: KitchenItem;
  done?: boolean;
  onMarkPrepared?: () => void;
  marking?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        done
          ? "border-ok/30 bg-ok/5 opacity-80"
          : "border-gold/40 bg-gold/5 shadow-[0_0_0_1px_rgba(212,168,87,0.08)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">
            {item.tableName}
          </p>
          <p className="mt-1 text-lg font-semibold leading-snug">{item.productName}</p>
          <p className="mt-1 text-sm text-cream-dim">
            {item.quantity} adet · {formatTime(item.createdAt)}
          </p>
          {item.note && (
            <p className="mt-2 rounded-lg bg-ink-soft px-2.5 py-1.5 text-xs text-warn">
              Not: {item.note}
            </p>
          )}
          {done && item.preparedAt && (
            <p className="mt-2 text-xs text-ok">Hazır · {formatTime(item.preparedAt)}</p>
          )}
        </div>
        {!done && onMarkPrepared && (
          <button
            type="button"
            onClick={onMarkPrepared}
            disabled={marking}
            aria-label="Hazırlandı olarak işaretle"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-ok bg-ok/15 text-2xl text-ok transition-colors hover:bg-ok/25 disabled:opacity-50 cursor-pointer"
          >
            ✓
          </button>
        )}
        {done && (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-ok/40 bg-ok/10 text-2xl text-ok">
            ✓
          </span>
        )}
      </div>
    </div>
  );
}

export function KitchenDisplay() {
  const [pending, setPending] = useState<KitchenItem[]>([]);
  const [completed, setCompleted] = useState<KitchenItem[]>([]);
  const [clearMinutes, setClearMinutes] = useState(30);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const knownPendingRef = useRef<Set<string> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    function unlock() {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
        addNotificationAudioContext(audioRef.current);
      }
      audioRef.current.resume();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      if (audioRef.current) {
        removeNotificationAudioContext(audioRef.current);
        audioRef.current.close().catch(() => {});
        audioRef.current = null;
      }
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/panel/kitchen");
      if (!res.ok) {
        setError("Adisyon verisi yüklenemedi");
        return;
      }
      const data: {
        pending: KitchenItem[];
        completed: KitchenItem[];
        clearMinutes: number;
      } = await res.json();

      if (knownPendingRef.current !== null) {
        const newOnes = data.pending.filter((p) => !knownPendingRef.current!.has(p.id));
        if (newOnes.length > 0) playNotificationChimeOnce();
      }
      knownPendingRef.current = new Set(data.pending.map((p) => p.id));

      setPending(data.pending);
      setCompleted(data.completed);
      setClearMinutes(data.clearMinutes);
      setError(null);
    } catch {
      setError("Bağlantı hatası");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function markPrepared(itemId: string) {
    setMarkingId(itemId);
    const res = await fetch(`/api/panel/orders/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prepared: true }),
    });
    if (res.ok) await load();
    else setError("İşaretleme başarısız");
    setMarkingId(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Adisyon</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Yeni siparişler burada görünür. Hazırlayınca tikleyin — teslim ayrı adımdır.
        </p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          Bekleyen Siparişler
          {pending.length > 0 && (
            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-line py-10 text-center text-sm text-cream-dim">
            Bekleyen sipariş yok
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((item) => (
              <KitchenCard
                key={item.id}
                item={item}
                onMarkPrepared={() => markPrepared(item.id)}
                marking={markingId === item.id}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-cream-dim">Tamamlanan Siparişler</h2>
        <p className="mb-3 text-xs text-cream-dim">
          Ekrandan {clearMinutes} dakika sonra otomatik temizlenir (kayıtlar silinmez).
        </p>
        {completed.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-line py-8 text-center text-sm text-cream-dim">
            Henüz tamamlanan sipariş yok
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((item) => (
              <KitchenCard key={item.id} item={item} done />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
