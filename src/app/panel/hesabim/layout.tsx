import Link from "next/link";
import Image from "next/image";

/** Müşteri hesabı chrome — işletme paneli IdleLogout kullanmaz. */
export default function HesabimLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink text-cream">
      <header className="border-b border-ink-line">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/panel/hesabim" className="flex items-center gap-2">
            <Image src="/tavern-logo.png" alt="Tavern" width={80} height={40} className="h-7 w-auto" />
            <span className="text-sm text-cream-dim">Hesabım</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6 pb-16">{children}</main>
    </div>
  );
}
