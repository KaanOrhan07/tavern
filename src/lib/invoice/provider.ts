/**
 * e-Arşiv / e-Adisyon entegrasyon katmanı (2.3.0 hazırlığı).
 *
 * Henüz gerçek entegratör bağlı DEĞİL: işletmede `invoiceProvider = "none"` iken hiçbir kayıt açılmaz.
 * Bir entegratör (Paraşüt, Logo, Foriba, Uyumsoft, Mikro…) seçildiğinde yalnızca `InvoiceProvider` arayüzünü
 * uygulayan bir sınıf yazılıp `PROVIDERS` kaydına eklenir; sipariş kapanınca açılan `InvoiceRecord` kuyruğunu
 * `/api/jobs/invoices` işçisi bu sağlayıcıya iletir (başarısızsa FAILED + hata metni, yeniden denenebilir).
 */
export type CreateInvoiceInput = {
  businessId: string;
  orderId: string;
  amountKurus: number;
  customerTaxId?: string;
  customerName?: string;
};

export type InvoiceResult = {
  id: string;
  status: "DRAFT" | "SENT" | "CANCELLED";
  externalId?: string;
  pdfUrl?: string;
};

export interface InvoiceProvider {
  /** Kayıtta saklanan anahtar (Business.invoiceProvider) */
  readonly key: string;
  createInvoice(input: CreateInvoiceInput): Promise<InvoiceResult>;
  cancelInvoice(externalId: string): Promise<void>;
  getInvoice(externalId: string): Promise<InvoiceResult>;
}

/** Bağlı entegratör yokken kullanılır: asla "gönderildi" demez, net hata verir. */
export class NotConfiguredInvoiceProvider implements InvoiceProvider {
  readonly key = "stub";
  async createInvoice(): Promise<InvoiceResult> {
    throw new Error("e-Arşiv entegratörü henüz bağlı değil");
  }
  async cancelInvoice(): Promise<void> {
    throw new Error("e-Arşiv entegratörü henüz bağlı değil");
  }
  async getInvoice(): Promise<InvoiceResult> {
    throw new Error("e-Arşiv entegratörü henüz bağlı değil");
  }
}

/** Gerçek entegratörler buraya eklenir: PROVIDERS.parasut = new ParasutProvider(); */
const PROVIDERS: Record<string, InvoiceProvider> = {
  stub: new NotConfiguredInvoiceProvider(),
};

export const INVOICE_PROVIDER_OPTIONS = [
  { key: "none", label: "Kapalı (fatura kaydı açılmaz)" },
  { key: "stub", label: "Test (entegratör bağlı değil — kayıtlar FAILED olur)" },
] as const;

export function getInvoiceProvider(key: string): InvoiceProvider | null {
  return PROVIDERS[key] ?? null;
}

export function isValidInvoiceProviderKey(key: string): boolean {
  return key === "none" || key in PROVIDERS;
}
