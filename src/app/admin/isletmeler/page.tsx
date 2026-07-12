import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState } from "@/components/ui";
import { CreateBusinessForm } from "@/components/admin/CreateBusinessForm";

export const dynamic = "force-dynamic";

export default async function BusinessListPage() {
  const [businesses, types] = await Promise.all([
    prisma.business.findMany({
      include: { type: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessType.findMany({ where: { active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">İşletmeler</h1>
        <CreateBusinessForm types={types.map((t) => ({ id: t.id, name: t.name }))} />
      </div>

      {businesses.length === 0 ? (
        <EmptyState
          title="Henüz işletme yok"
          description="Sağ üstteki butondan ilk işletmeyi oluşturun."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {businesses.map((b) => (
            <Link key={b.id} href={`/admin/isletmeler/${b.slug}`}>
              <Card className="transition-colors hover:border-gold-dark">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="mt-0.5 text-xs text-cream-dim">
                      /{b.slug} · {b.type.name}
                    </p>
                  </div>
                  <Badge tone={b.active ? "ok" : "danger"}>
                    {b.active ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
