import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { formatKurus } from "@/lib/utils";

// 3.0: komut paleti araması — ürün, masa, müşteri, hizmet, randevu (işletmeye göre)
export async function GET(request: Request) {
  const ctx = await requirePanel();
  if (isGuardError(ctx)) return ctx;
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ results: [] });

  const businessId = ctx.business.id;
  const owner = ctx.session.role === "owner";
  const contains = { contains: q, mode: "insensitive" as const };

  const [products, tables, customers, services, appointments] = await Promise.all([
    owner
      ? prisma.product.findMany({
          where: { businessId, name: contains },
          select: { id: true, name: true, priceKurus: true, active: true },
          take: 6,
        })
      : [],
    prisma.table.findMany({ where: { businessId, name: contains }, select: { id: true, name: true }, take: 6 }),
    owner
      ? prisma.customer.findMany({
          where: { businessId, OR: [{ name: contains }, { phone: { contains: q } }] },
          select: { id: true, name: true, phone: true },
          take: 5,
        })
      : [],
    owner
      ? prisma.service.findMany({ where: { businessId, name: contains }, select: { id: true, name: true, priceKurus: true }, take: 4 })
      : [],
    prisma.appointment.findMany({
      where: { businessId, OR: [{ customerName: contains }, { customerPhone: { contains: q } }] },
      select: { id: true, customerName: true, startAt: true },
      orderBy: { startAt: "desc" },
      take: 4,
    }),
  ]);

  const results = [
    ...tables.map((t) => ({ kind: "table", id: t.id, title: t.name, subtitle: "Masa", href: "masalar" })),
    ...products.map((p) => ({
      kind: "product",
      id: p.id,
      title: p.name,
      subtitle: `Ürün · ${formatKurus(p.priceKurus)}${p.active ? "" : " · pasif"}`,
      href: "menu",
    })),
    ...services.map((s) => ({ kind: "service", id: s.id, title: s.name, subtitle: `Hizmet · ${formatKurus(s.priceKurus)}`, href: "hizmetler" })),
    ...customers.map((c) => ({
      kind: "customer",
      id: c.id,
      title: c.name || c.phone,
      subtitle: `Müşteri · ${c.phone}`,
      href: "musteriler",
    })),
    ...appointments.map((a) => ({
      kind: "appointment",
      id: a.id,
      title: a.customerName,
      subtitle: `Randevu · ${a.startAt.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}`,
      href: "randevular",
    })),
  ];
  return NextResponse.json({ results });
}
