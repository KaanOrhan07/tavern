/**
 * Yazar kasa (ÖKC / POS) entegrasyon SÖZLEŞMESİ — masaüstü uygulaması / ajanı için.
 *
 * Yazar kasalar yerel donanımdır (seri/TCP/USB, üretici SDK'sı); bu yüzden entegrasyon sunucuda değil
 * MASAÜSTÜ AJANINDA yaşar. Akış (tek marka ile başlanır, bkz. docs/CLIENT_API.md "POS"):
 *   1. Ödeme alınınca sunucu bir `PrintJob` (kind: "POS_SALE") ekler  → payload: PosSaleRequest
 *   2. Masaüstü ajanı işi çeker, bu arayüzü uygulayan marka adaptörüne verir
 *   3. Sonuç /api/v1/print/jobs/{id}/ack ile bildirilir (fiş no / hata)
 * Bu dosya adaptör yazarlarının uyacağı tipleri tanımlar; sunucu bu arayüzü doğrudan çağırmaz.
 */
export type PosPaymentMethod = "CASH" | "CARD" | "MEAL_CARD" | "OTHER";

export type PosSaleRequest = {
  orderId: string;
  tableName: string;
  /** KDV dahil toplam (kuruş) */
  totalKurus: number;
  method: PosPaymentMethod;
  methodDetail?: string | null;
  lines: { name: string; quantity: number; unitKurus: number; vatPercent?: number }[];
};

export type PosSaleResult =
  | { ok: true; receiptNo?: string; fiscalId?: string }
  | { ok: false; error: string; retryable: boolean };

export interface PosAdapter {
  /** Marka/model anahtarı (ör. "ingenico-ix", "hugin-tiger") */
  readonly id: string;
  readonly name: string;
  /** Cihaza erişilebiliyor mu (bağlantı/test) */
  ping(): Promise<boolean>;
  sale(req: PosSaleRequest): Promise<PosSaleResult>;
  /** İsteğe bağlı: iade/iptal, Z raporu */
  refund?(receiptNo: string, amountKurus: number): Promise<PosSaleResult>;
  zReport?(): Promise<{ ok: boolean; error?: string }>;
}
