"use client";

import { useEffect, useRef } from "react";

const IDLE_MS = 30 * 60 * 1000; // 30 dakika

/** Uzun süre etkileşim olmazsa oturumu sonlandırır. */
export function IdleLogout({
  logoutUrl,
  redirectUrl,
}: {
  logoutUrl: string;
  redirectUrl: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await fetch(logoutUrl, { method: "POST" }).catch(() => {});
        window.location.href = redirectUrl;
      }, IDLE_MS);
    }

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, reset, { passive: true });
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const e of events) window.removeEventListener(e, reset);
    };
  }, [logoutUrl, redirectUrl]);

  return null;
}
