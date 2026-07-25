/** Her sorguya businessId ekler — tenant izolasyonu için zorunlu yardımcı. */
export function tenantWhere<T extends object>(
  businessId: string,
  where: T = {} as T
): T & { businessId: string } {
  return {
    ...where,
    businessId,
  };
}
