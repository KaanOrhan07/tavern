import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { CustomerHome } from "@/components/musteri/CustomerHome";

export const dynamic = "force-dynamic";

export default async function PanelHesabimPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/panel/giris-yap");
  return <CustomerHome />;
}
