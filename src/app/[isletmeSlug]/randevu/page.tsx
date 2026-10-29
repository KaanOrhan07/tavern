import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isBarberBusiness } from "@/lib/business-modules";
import { BookingWidget } from "@/components/musteri/BookingWidget";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
    include: { type: true },
  });
  if (!business || !business.active || !isBarberBusiness(business.type.key)) {
    notFound();
  }

  // Kapak ve yapışkan çubuk ekranın kenarına dayansın diye layout'un yan boşluğunu kır
  return (
    <div className="-mx-4 -mt-3">
      <BookingWidget slug={isletmeSlug} />
    </div>
  );
}
