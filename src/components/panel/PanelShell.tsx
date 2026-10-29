"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Ellipsis, LogOut, Search, X } from "lucide-react";
import { Badge } from "@/components/ui";
import { NotificationCenter } from "@/components/panel/NotificationCenter";
import { CommandPalette } from "@/components/panel/CommandPalette";
import { IdleLogout } from "@/components/IdleLogout";
import { RealtimeProvider } from "@/lib/realtime-client";
import { PanelOfflineSupport } from "@/components/panel/PanelOfflineSupport";
import { isBarberBusiness } from "@/lib/business-modules";
import { buildNav, type NavEntry } from "@/components/panel/nav-config";
import type { FeatureKey } from "@/lib/feature-defs";

export function PanelShell({
  slug,
  businessId,
  businessName,
  businessTypeKey,
  role,
  userName,
  features,
  printerEnabled,
  idleLogout = true,
  children,
}: {
  slug: string;
  businessId: string;
  businessName: string;
  businessTypeKey: string;
  role: "owner" | "staff";
  userName: string;
  features: Record<FeatureKey, boolean>;
  printerEnabled: boolean;
  /** "Beni hatırla" ile girilen oturumlarda 30 dk hareketsizlik çıkışı kapalıdır */
  idleLogout?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/panel/${slug}`;
  const barber = isBarberBusiness(businessTypeKey);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const items = buildNav(base, barber).filter((item) => {
    if (item.ownerOnly && role !== "owner") return false;
    if (item.feature && !features[item.feature]) return false;
    return true;
  });
  const groups = items.reduce<{ name: string; entries: NavEntry[] }[]>((acc, it) => {
    const g = acc.find((x) => x.name === it.group);
    if (g) g.entries.push(it);
    else acc.push({ name: it.group, entries: [it] });
    return acc;
  }, []);
  const primary = items.filter((i) => i.primary).slice(0, 4);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Ctrl/⌘+K → hızlı arama; "/" (yazı alanı dışında) da açar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sayfa değişince çekmece kapanır
    setMoreOpen(false);
  }, [pathname]);

  const closePalette = useCallback(() => setPaletteOpen(false), []);

  async function logout() {
    await fetch("/api/panel/logout", { method: "POST" });
    // Paylaşılan cihazda çıkış sonrası önbellekteki panel sayfaları silinsin
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PAGES" });
    router.push(`/panel/${slug}/giris`);
    router.refresh();
  }

  return (
    <RealtimeProvider businessId={businessId}>
      <PanelOfflineSupport />
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-ink"
      >
        İçeriğe geç
      </a>
      <div className="flex min-h-screen">
        {idleLogout && <IdleLogout logoutUrl="/api/panel/logout" redirectUrl={`${base}/giris`} />}

        {/* Masaüstü sol menü */}
        <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-ink-line bg-ink-soft md:flex">
          <div className="border-b border-ink-line p-4">
            <Image src="/tavern-logo.png" alt="Tavern" width={120} height={80} className="mb-2 h-10 w-auto" />
            <p className="truncate text-sm font-medium text-cream">{businessName}</p>
            <div className="mt-1.5">
              <Badge tone={role === "owner" ? "gold" : "neutral"}>
                {role === "owner" ? "İşletme Sahibi" : "Personel"} · {userName}
              </Badge>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3" aria-label="Panel menüsü">
            {groups.map((g) => (
              <div key={g.name} className="mb-3">
                <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-cream-dim/70">{g.name}</p>
                <div className="space-y-0.5">
                  {g.entries.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`pressable relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                          active ? "bg-gold/10 font-medium text-gold" : "text-cream-dim hover:bg-ink-card hover:text-cream"
                        }`}
                      >
                        {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" aria-hidden />}
                        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-ink-line p-3">
            <button
              type="button"
              onClick={logout}
              className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-cream-dim hover:bg-ink-card hover:text-cream"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden />
              Çıkış Yap
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Üst bar (mobil + masaüstü): arama + bildirim */}
          <header className="glass sticky top-0 z-20 flex items-center gap-2 border-b border-ink-line px-4 py-2.5 md:px-6">
            <div className="min-w-0 md:hidden">
              <p className="truncate text-sm font-medium">{businessName}</p>
              <p className="text-xs text-cream-dim">{userName}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 md:w-full md:max-w-md md:justify-between">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Ara (Ctrl K)"
                className="pressable flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-ink-line bg-ink-soft px-3 text-sm text-cream-dim hover:border-gold md:flex-1"
              >
                <Search className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Ara…</span>
                <kbd className="ml-auto hidden rounded border border-ink-line px-1.5 text-[10px] md:block">Ctrl K</kbd>
              </button>
              <NotificationCenter printerEnabled={printerEnabled} />
            </div>
          </header>

          <main id="icerik" className="flex-1 p-4 pb-28 sm:p-6 md:pb-6">
            <div className="anim-fade-in mx-auto w-full max-w-[1400px]">{children}</div>
          </main>

          {/* Mobil alt çubuk: ≤5 öğe (4 ana + "Daha fazla") */}
          <nav
            aria-label="Hızlı erişim"
            className="glass fixed inset-x-0 bottom-0 z-20 grid border-t border-ink-line pb-[env(safe-area-inset-bottom,0px)] md:hidden"
            style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}
          >
            {primary.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`pressable flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] ${
                    active ? "font-medium text-gold" : "text-cream-dim"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="max-w-full truncate px-1">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className="pressable flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] text-cream-dim"
            >
              <Ellipsis className="h-5 w-5" aria-hidden />
              Daha fazla
            </button>
          </nav>
        </div>
      </div>

      {/* Mobil "Daha fazla" çekmecesi */}
      {moreOpen && (
        <div className="anim-fade-in fixed inset-0 z-[90] bg-black/55 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tüm menü"
            className="anim-sheet-up absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-ink-line bg-ink-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">Tüm menü</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Kapat"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-cream-dim hover:bg-ink-soft"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {groups.map((g) => (
              <div key={g.name} className="mb-4">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-cream-dim/70">{g.name}</p>
                <div className="grid grid-cols-3 gap-2">
                  {g.entries.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`pressable flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-1 text-center text-xs ${
                          active ? "border-gold bg-gold/10 text-gold" : "border-ink-line bg-ink-soft text-cream"
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={logout}
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink-line text-sm text-cream-dim"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Çıkış Yap
            </button>
          </div>
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={closePalette} base={base} pages={items} />
    </RealtimeProvider>
  );
}
