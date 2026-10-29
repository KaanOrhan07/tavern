"use client";

import { useEffect, useRef } from "react";
import { useRealtimeContext } from "@/lib/realtime-context";
import type { RealtimeEvent } from "@/lib/realtime";

/**
 * setInterval benzeri; sekme gizliyken durur, görünür olunca hemen bir kez çalışır.
 *
 * `realtime` verilirse (ör. ["orders","kitchen"]): Supabase Realtime bağlıyken bu olaylarda anında tazelenir
 * ve polling 4 kat seyrelir (yedek olarak sürer). Realtime yoksa/kopuksa davranış eskisi gibidir.
 */
export function useVisibleInterval(callback: () => void, ms: number, realtime?: RealtimeEvent[]) {
  const rt = useRealtimeContext();
  const connected = rt?.connected ?? false;
  const effectiveMs = realtime && connected ? ms * 4 : ms;
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const clear = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      clear();
      callback();
      timer = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        callback();
      }, effectiveMs);
    };

    const onVisibility = () => {
      if (document.hidden) clear();
      else start();
    };

    if (typeof document === "undefined" || !document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [callback, effectiveMs]);

  // Realtime ipuçları: 250 ms birleştirerek (debounce) tazele
  const eventsKey = realtime?.join(",") ?? "";
  useEffect(() => {
    if (!rt || !eventsKey) return;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const off = rt.subscribe(eventsKey.split(",") as RealtimeEvent[], () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        if (typeof document === "undefined" || !document.hidden) cbRef.current();
      }, 250);
    });
    return () => {
      off();
      if (pending) clearTimeout(pending);
    };
  }, [rt, eventsKey]);
}
