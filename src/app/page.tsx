import Link from "next/link";
import { TavernLogo } from "@/components/ui";

const ROLES = [
  {
    href: "/panel/giris-yap",
    icon: "👤",
    title: "Müşteri Girişi",
    desc: "Sadakat puanların, randevuların ve geçmişin",
  },
  {
    href: "/panel?rol=owner",
    icon: "🏪",
    title: "İşletme Girişi",
    desc: "İşletme sahibi paneli",
  },
  {
    href: "/panel?rol=staff",
    icon: "🧑‍🍳",
    title: "Personel Girişi",
    desc: "PIN ile personel paneli",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <TavernLogo size="lg" showTagline />
      <p className="text-sm tracking-widest text-cream-dim uppercase">Manage. Grow. Thrive.</p>
      <div className="mt-4 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-ink-line bg-ink-card p-5 text-center transition-colors hover:border-gold-dark"
          >
            <span className="text-3xl" aria-hidden>
              {r.icon}
            </span>
            <span className="font-semibold">{r.title}</span>
            <span className="text-xs text-cream-dim">{r.desc}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
