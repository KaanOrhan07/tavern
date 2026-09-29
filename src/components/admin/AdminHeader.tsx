"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";

const COMMON_LINKS = [
  { href: "/admin/isletmeler", label: "İşletmeler" },
  { href: "/admin/abonelikler", label: "Abonelik / Ödeme" },
  { href: "/admin/musteriler", label: "Müşteriler" },
  { href: "/admin/canli-siparisler", label: "Canlı Siparişler" },
];
const SUPER_LINKS = [
  { href: "/admin/yoneticiler", label: "Yöneticiler" },
  { href: "/admin/loglar", label: "İşlem Logları" },
  { href: "/admin/sistem", label: "Sistem Ayarları" },
];

type Notice = { id: string; message: string; readAt: string | null; createdAt: string };

export function AdminHeader({ level, adminName }: { level: "super" | "sub"; adminName: string }) {
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const router = useRouter();
  const isSuper = level === "super";

  useEffect(() => {
    if (!isSuper) return;
    let alive = true;
    const load = () =>
      fetch("/api/admin/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d) {
            setNotices(d.items);
            setUnread(d.unread);
          }
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [isSuper]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/giris");
    router.refresh();
  }

  async function openBell() {
    setBell(!bell);
    if (!bell && unread > 0) {
      await fetch("/api/admin/notifications", { method: "PATCH" });
      setUnread(0);
    }
  }

  const links = isSuper ? [...COMMON_LINKS, ...SUPER_LINKS] : COMMON_LINKS;

  return (
    <header className="sticky top-0 z-20 border-b border-ink-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Menü"
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-ink-soft cursor-pointer"
          >
            <span className="h-0.5 w-5 bg-cream" />
            <span className="h-0.5 w-5 bg-cream" />
            <span className="h-0.5 w-5 bg-cream" />
          </button>
          <Image src="/tavern-logo.png" alt="Tavern" width={90} height={60} className="h-7 w-auto" />
          <Badge tone="gold">{isSuper ? "Ana Admin" : "Yönetici"}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {isSuper && (
            <div className="relative">
              <button
                type="button"
                aria-label="Bildirimler"
                onClick={openBell}
                className="relative h-9 w-9 rounded-lg text-lg hover:bg-ink-soft cursor-pointer"
              >
                🔔
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">
                    {unread}
                  </span>
                )}
              </button>
              {bell && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-ink-line bg-ink-soft p-2 shadow-xl">
                  {notices.length === 0 ? (
                    <p className="p-3 text-xs text-cream-dim">Bildirim yok</p>
                  ) : (
                    notices.map((n) => (
                      <div key={n.id} className="rounded-lg p-2 text-xs hover:bg-ink-card">
                        <p>{n.message}</p>
                        <p className="mt-0.5 text-[10px] text-cream-dim">
                          {new Date(n.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          <span className="hidden text-xs text-cream-dim sm:inline">{adminName}</span>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-cream-dim hover:text-cream cursor-pointer"
          >
            Çıkış
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-ink-line bg-ink-soft">
          <div className="mx-auto max-w-5xl space-y-1 px-4 py-2 sm:px-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-cream hover:bg-ink-card"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
