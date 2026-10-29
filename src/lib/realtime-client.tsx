"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { RealtimeEvent } from "@/lib/realtime";
import { RealtimeContext, type RealtimeCtx } from "@/lib/realtime-context";

/**
 * İstemci tarafı Realtime: `tavern:<businessId>` kanalında "yenile" ipuçlarını dinler.
 * Olaylar veri taşımaz; bileşenler kendi API'lerinden veriyi tazeler. Bağlantı yoksa/kopuksa
 * bileşenler normal polling ile çalışmaya devam eder (useVisibleInterval).
 */
type Listener = { events: RealtimeEvent[]; cb: () => void };

export function RealtimeProvider({ businessId, children }: { businessId: string; children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;

    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const channel = client
      .channel(`tavern:${businessId}`)
      .on("broadcast", { event: "*" }, (msg: { event: string }) => {
        for (const l of listeners.current) {
          if (l.events.includes(msg.event as RealtimeEvent)) l.cb();
        }
      })
      .subscribe((status: string) => setConnected(status === "SUBSCRIBED"));

    return () => {
      setConnected(false);
      void client.removeChannel(channel);
    };
  }, [businessId]);

  const value = useMemo<RealtimeCtx>(
    () => ({
      connected,
      subscribe(events, cb) {
        const l: Listener = { events, cb };
        listeners.current.add(l);
        return () => {
          listeners.current.delete(l);
        };
      },
    }),
    [connected]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
