"use client";

import { useEffect } from "react";

/**
 * setInterval benzeri; sekme gizliyken durur, görünür olunca hemen bir kez çalışır.
 */
export function useVisibleInterval(callback: () => void, ms: number) {
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
      }, ms);
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
  }, [callback, ms]);
}
