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

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-lg font-semibold">Randevu Al</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Hizmet, personel ve saat seçerek randevunuzu oluşturun. Hesap gerekmez.
        </p>
      </div>
      <BookingWidget slug={isletmeSlug} />
    </div>
  );
}
