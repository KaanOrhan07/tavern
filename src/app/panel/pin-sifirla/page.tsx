import Link from "next/link";
import Image from "next/image";
import { CustomerPinResetForm } from "@/components/musteri/CustomerPinResetForm";

export const dynamic = "force-dynamic";

export default function PanelPinSifirlaPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-ink px-4 py-8 text-cream">
      <Link href="/panel/hesabim" className="mb-6 flex items-center gap-2">
        <Image src="/tavern-logo.png" alt="Tavern" width={80} height={40} className="h-7 w-auto" />
      </Link>
      <CustomerPinResetForm />
    </div>
  );
}
