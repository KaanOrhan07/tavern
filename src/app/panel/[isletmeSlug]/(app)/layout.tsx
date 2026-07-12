import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPanelSessionFor } from "@/lib/auth";
import { getFeatureMap } from "@/lib/features";
import { PanelShell } from "@/components/panel/PanelShell";

export default async function PanelAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const session = await getPanelSessionFor(isletmeSlug);
  if (!session) redirect(`/panel/${isletmeSlug}/giris`);

  // Sırayla değil paralel çalıştır: her navigasyonda gecikmeyi azaltır
  // (ikisi de session.businessId'ye bağlı, birbirine bağımlı değil)
  const [business, features] = await Promise.all([
    prisma.business.findUnique({ where: { id: session.businessId } }),
    getFeatureMap(session.businessId),
  ]);
  if (!business) redirect("/panel");
  if (!business.active) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-center text-cream-dim">
          Bu işletme şu anda pasif durumda. Lütfen yöneticinizle iletişime geçin.
        </p>
      </main>
    );
  }

  return (
    <PanelShell
      slug={isletmeSlug}
      businessName={business.name}
      role={session.role}
      userName={session.name}
      features={features}
      printerEnabled={features.kitchen_printer}
    >
      {children}
    </PanelShell>
  );
}
