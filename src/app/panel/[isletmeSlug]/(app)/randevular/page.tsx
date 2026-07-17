import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { isBarberBusiness } from "@/lib/business-modules";
import { AppointmentsBoard } from "@/components/panel/AppointmentsBoard";
import { CustomerPublicLink } from "@/components/panel/CustomerPublicLink";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    include: { type: true },
  });
  if (!business || !isBarberBusiness(business.type.key)) {
    redirect(`/panel/${isletmeSlug}/dashboard`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Randevular</h1>
      <CustomerPublicLink
        slug={isletmeSlug}
        path="/randevu"
        title="Müşteri Randevu Linki"
        description="Müşteriler bu linkten randevu alır. QR kodu dükkan vitrinine asabilirsiniz."
      />
      <AppointmentsBoard />
    </div>
  );
}
