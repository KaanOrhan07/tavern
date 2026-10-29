/** Sipariş modu yardımcıları — istemci ve sunucuda ortak (server-only import yok). */
export type OrderModeValue = "WAITER_ONLY" | "CUSTOMER_QR" | "BOTH";

/** Müşteri QR ile sipariş verebilir mi? (konum şartı bu durumda zorunlu) */
export function qrOrderingEnabled(mode: OrderModeValue): boolean {
  return mode === "CUSTOMER_QR" || mode === "BOTH";
}

/** Garson panelden sipariş girebilir mi? */
export function waiterOrderingEnabled(mode: OrderModeValue): boolean {
  return mode === "WAITER_ONLY" || mode === "BOTH";
}

export const ORDER_MODE_LABEL: Record<OrderModeValue, string> = {
  WAITER_ONLY: "Sadece Garson",
  CUSTOMER_QR: "Müşteri QR",
  BOTH: "Garson + Müşteri QR",
};
