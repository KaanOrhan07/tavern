"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { NotificationCenter } from "@/components/panel/NotificationCenter";
import { IdleLogout } from "@/components/IdleLogout";
import { isBarberBusiness } from "@/lib/business-modules";
import type { FeatureKey } from "@/lib/feature-defs";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  ownerOnly?: boolean;
  feature?: FeatureKey;
};

export function PanelShell({
  slug,
  businessName,
  businessTypeKey,
  role,
  userName,
  features,
  printerEnabled,
  children,
}: {
  slug: string;
  businessName: string;
  businessTypeKey: string;
  role: "owner" | "staff";
  userName: string;
  features: Record<FeatureKey, boolean>;
  printerEnabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/panel/${slug}`;
  const barber = isBarberBusiness(businessTypeKey);

  const restaurantItems: NavItem[] = [
    { href: `${base}/dashboard`, label: "Genel Bakış", icon: "◈", ownerOnly: true },
    { href: `${base}/masalar`, label: "Masalar", icon: "▦" },
    { href: `${base}/adisyon`, label: "Adisyon", icon: "◉" },
    { href: `${base}/menu`, label: "Menü", icon: "☰", ownerOnly: true },
    { href: `${base}/stok`, label: "Stok", icon: "▤", ownerOnly: true, feature: "stock" },
    { href: `${base}/personeller`, label: "Personeller", icon: "◎", ownerOnly: true },
    { href: `${base}/raporlar`, label: "Raporlar", icon: "▲", ownerOnly: true },
    { href: `${base}/gun-sonu`, label: "Gün Sonu", icon: "◷", ownerOnly: true },
    { href: `${base}/talepler`, label: "Talepler", icon: "✎", feature: "staff_requests" },
    { href: `${base}/ayarlar`, label: "Ayarlar", icon: "⚙", ownerOnly: true },
  ];

  const barberItems: NavItem[] = [
    { href: `${base}/dashboard`, label: "Genel Bakış", icon: "◈", ownerOnly: true },
    { href: `${base}/randevular`, label: "Randevular", icon: "◷" },
    { href: `${base}/hizmetler`, label: "Hizmetler", icon: "☰", ownerOnly: true },
    { href: `${base}/stok`, label: "Stok", icon: "▤", ownerOnly: true, feature: "stock" },
    { href: `${base}/personeller`, label: "Personeller", icon: "◎", ownerOnly: true },
    { href: `${base}/ayarlar`, label: "Ayarlar", icon: "⚙", ownerOnly: true },
  ];

  const allItems = barber ? barberItems : restaurantItems;

  const items = allItems.filter((item) => {
    if (item.ownerOnly && role !== "owner") return false;
    if (item.feature && !features[item.feature]) return false;
    return true;
  });

  // Mobil: tüm menü öğeleri kaydırılabilir (hiçbiri gizlenmez)
  const mobileItems = items;

  async function logout() {
    await fetch("/api/panel/logout", { method: "POST" });
    router.push(`/panel/${slug}/giris`);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <IdleLogout logoutUrl="/api/panel/logout" redirectUrl={`${base}/giris`} />
      {/* Masaüstü sol menü */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-ink-line bg-ink-soft md:flex">
        <div className="border-b border-ink-line p-4">
          <Image
            src="/tavern-logo.png"
            alt="Tavern"
            width={120}
            height={80}
            className="mb-2 h-10 w-auto"
          />
          <p className="truncate text-sm text-cream">{businessName}</p>
          <div className="mt-1.5">
            <Badge tone={role === "owner" ? "gold" : "neutral"}>
              {role === "owner" ? "İşletme Sahibi" : "Personel"} · {userName}
            </Badge>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-gold/10 text-gold"
                  : "text-cream-dim hover:bg-ink-card hover:text-cream"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ink-line p-3">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-cream-dim hover:bg-ink-card hover:text-cream cursor-pointer"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil üst bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-line bg-ink/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{businessName}</p>
            <p className="text-xs text-cream-dim">{userName}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter printerEnabled={printerEnabled} />
            <button
              type="button"
              onClick={logout}
              className="text-xs text-cream-dim cursor-pointer"
            >
              Çıkış
            </button>
          </div>
        </header>

        {/* Masaüstü üst bar (sadece bildirim) */}
        <div className="sticky top-0 z-20 hidden justify-end border-b border-ink-line bg-ink/90 px-6 py-2.5 backdrop-blur md:flex">
          <NotificationCenter printerEnabled={printerEnabled} />
        </div>

        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6">{children}</main>

        {/* Mobil alt menü — yatay kaydırma */}
        <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-0.5 overflow-x-auto border-t border-ink-line bg-ink-soft px-1 md:hidden">
          {mobileItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-16 min-w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 px-2 text-[10px] ${
                pathname.startsWith(item.href) ? "text-gold" : "text-cream-dim"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
