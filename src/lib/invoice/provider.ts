/** e-Fatura entegrasyon hazırlığı — henüz gerçek sağlayıcı yok. */

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
  createInvoice(input: CreateInvoiceInput): Promise<InvoiceResult>;
  cancelInvoice(id: string): Promise<void>;
  getInvoice(id: string): Promise<InvoiceResult>;
}

/** Placeholder sağlayıcı — ileride özel entegratör bağlanır. */
export class StubInvoiceProvider implements InvoiceProvider {
  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceResult> {
    return {
      id: `stub_${input.orderId}`,
      status: "DRAFT",
    };
  }

  async cancelInvoice(_id: string): Promise<void> {
    return;
  }

  async getInvoice(id: string): Promise<InvoiceResult> {
    return { id, status: "DRAFT" };
  }
}

export function getInvoiceProvider(): InvoiceProvider {
  return new StubInvoiceProvider();
}
