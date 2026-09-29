import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCustomerSession } from "@/lib/customer-auth";
import { safeNextPath } from "@/lib/safe-redirect";
import { CustomerLoginForm } from "@/components/musteri/CustomerAuthForms";

export const dynamic = "force-dynamic";

export default async function PanelMusteriGirisPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getCustomerSession();
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  if (session) redirect(nextPath);

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-ink px-4 py-8 text-cream">
      <Link href="/panel/hesabim" className="mb-6 flex items-center gap-2">
        <Image src="/tavern-logo.png" alt="Tavern" width={80} height={40} className="h-7 w-auto" />
      </Link>
      <CustomerLoginForm nextPath={nextPath} />
    </div>
  );
}
