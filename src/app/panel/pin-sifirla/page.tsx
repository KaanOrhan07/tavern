import Link from "next/link";
import Image from "next/image";
import { otpRequired } from "@/lib/customer-auth";
import { CustomerPinResetForm } from "@/components/musteri/CustomerPinResetForm";

export const dynamic = "force-dynamic";

export default function PanelPinSifirlaPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-ink px-4 py-8 text-cream">
      <Link href="/panel/hesabim" className="mb-6 flex items-center gap-2">
        <Image src="/tavern-logo.png" alt="Tavern" width={80} height={40} className="h-7 w-auto" />
      </Link>
      {otpRequired() ? (
        <CustomerPinResetForm />
      ) : (
        <div className="rounded-2xl border border-ink-line bg-ink-card p-5 text-sm">
          <h1 className="mb-2 text-lg font-semibold">PIN sıfırlama şu an kapalı</h1>
          <p className="text-cream-dim">PIN&apos;ini unuttuysan işletmeyle veya Tavern yöneticisiyle iletişime geç; PIN&apos;ini senin için sıfırlayabilirler.</p>
        </div>
      )}
    </div>
  );
}
