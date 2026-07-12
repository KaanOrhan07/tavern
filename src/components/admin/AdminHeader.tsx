"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";

export function AdminHeader() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/giris");
    router.refresh();
  }

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
          <Image
            src="/tavern-logo.png"
            alt="Tavern"
            width={90}
            height={60}
            className="h-7 w-auto"
          />
          <Badge tone="gold">Yönetici</Badge>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-cream-dim hover:text-cream cursor-pointer"
        >
          Çıkış
        </button>
      </div>
      {open && (
        <nav className="border-t border-ink-line bg-ink-soft">
          <div className="mx-auto max-w-5xl px-4 py-2 sm:px-6">
            <Link
              href="/admin/isletmeler"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-cream hover:bg-ink-card"
            >
              İşletmeler
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
