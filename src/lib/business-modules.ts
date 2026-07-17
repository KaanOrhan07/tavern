/** İşletme türü anahtarları — modül yönlendirmesi için. */
export const BUSINESS_TYPES = {
  RESTAURANT: "restaurant",
  BARBER: "barber",
} as const;

export type BusinessTypeKey = (typeof BUSINESS_TYPES)[keyof typeof BUSINESS_TYPES];

export function isBarberBusiness(typeKey: string) {
  return typeKey === BUSINESS_TYPES.BARBER;
}

export function isRestaurantBusiness(typeKey: string) {
  return typeKey === BUSINESS_TYPES.RESTAURANT;
}

export function defaultStaffPath(slug: string, typeKey: string) {
  return isBarberBusiness(typeKey)
    ? `/panel/${slug}/randevular`
    : `/panel/${slug}/masalar`;
}

export function defaultCustomerPath(slug: string, typeKey: string) {
  return isBarberBusiness(typeKey) ? `/${slug}/randevu` : `/${slug}/menu`;
}
