import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { CustomerBusinessHistory } from "@/components/musteri/CustomerBusinessHistory";

export const dynamic = "force-dynamic";

export default async function PanelHesabimIsletmePage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/panel/giris-yap");
  const { isletmeSlug } = await params;
  return <CustomerBusinessHistory slug={isletmeSlug} />;
}
