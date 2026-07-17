import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { defaultStaffPath, isBarberBusiness } from "@/lib/business-modules";

export async function getBusinessTypeKey(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { type: true },
  });
  return business?.type.key ?? null;
}

export async function requireRestaurantModule(slug: string, businessId: string) {
  const typeKey = await getBusinessTypeKey(businessId);
  if (typeKey && isBarberBusiness(typeKey)) {
    redirect(`/panel/${slug}/randevular`);
  }
}

export async function requireBarberModule(slug: string, businessId: string) {
  const typeKey = await getBusinessTypeKey(businessId);
  if (typeKey && !isBarberBusiness(typeKey)) {
    redirect(`/panel/${slug}/masalar`);
  }
}

export async function redirectStaffIfNeeded(
  slug: string,
  businessId: string,
  role: "owner" | "staff",
  ownerPath: string
) {
  if (role === "owner") return;
  const typeKey = await getBusinessTypeKey(businessId);
  if (!typeKey) redirect(`/panel/${slug}/giris`);
  redirect(defaultStaffPath(slug, typeKey));
}
