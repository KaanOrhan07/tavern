import Link from "next/link";
import { TavernLogo } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <TavernLogo size="lg" showTagline />
      <p className="text-sm tracking-widest text-cream-dim uppercase">
        Manage. Grow. Thrive.
      </p>
      <Link
        href="/panel"
        className="mt-4 rounded-lg border border-ink-line px-6 py-3 text-sm text-cream hover:border-gold-dark transition-colors"
      >
        İşletme Girişi
      </Link>
    </main>
  );
}
