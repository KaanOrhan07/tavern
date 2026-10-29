"use client";

import { createContext, useContext } from "react";
import type { RealtimeEvent } from "@/lib/realtime";

/**
 * Realtime bağlamı (hafif): `useVisibleInterval` gibi her sayfada kullanılan hook'lar yalnızca bunu içe aktarır;
 * ağır `@supabase/supabase-js` paketi sadece panelde `RealtimeProvider` ile yüklenir (müşteri sayfaları şişmez).
 */
export type RealtimeCtx = {
  connected: boolean;
  subscribe: (events: RealtimeEvent[], cb: () => void) => () => void;
};

export const RealtimeContext = createContext<RealtimeCtx | null>(null);

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}
