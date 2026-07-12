import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { StaffManager } from "@/components/panel/StaffManager";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);
  if (session.role !== "owner") redirect(`/panel/${isletmeSlug}/masalar`);

  const staff = await prisma.user.findMany({
    where: { businessId: session.businessId, role: "STAFF" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, pin: true, active: true },
  });

  return (
    <StaffManager
      staff={staff.map((s) => ({ ...s, pin: s.pin ?? "" }))}
    />
  );
}
