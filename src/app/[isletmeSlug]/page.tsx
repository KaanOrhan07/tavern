import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { defaultCustomerPath } from "@/lib/business-modules";

export const dynamic = "force-dynamic";

/** Müşteri kısa linki: /{slug} → menü veya randevu sayfasına yönlendirir. */
export default async function BusinessLandingPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
    include: { type: true },
  });
  if (!business || !business.active) notFound();

  redirect(defaultCustomerPath(isletmeSlug, business.type.key));
}
