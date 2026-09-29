import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBarberSettings } from "@/lib/appointments";
import { isBarberBusiness } from "@/lib/business-modules";

export const dynamic = "force-dynamic";

export default async function BusinessInfoPage({
  params,
}: {
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
    include: { type: true, businessInfo: true },
  });
  if (!business || !business.active) notFound();

  const info = business.businessInfo;
  let hours: string | null = null;
  if (isBarberBusiness(business.type.key)) {
    const s = await getBarberSettings(business.id);
    hours = `${s.openTime} – ${s.closeTime}`;
  }

  // Öncelik: işletmenin yapıştırdığı Google Maps linki → koordinat → adres
  const mapsUrl =
    info?.mapsUrl ??
    (info?.latitude != null && info?.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`
      : info?.address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(info.address)}`
        : null);

  const links = [
    { label: "Instagram", href: info?.instagramUrl },
    { label: "TikTok", href: info?.tiktokUrl },
    { label: "YouTube", href: info?.youtubeUrl },
    { label: "Facebook", href: info?.facebookUrl },
    { label: "LinkedIn", href: info?.linkedinUrl },
    { label: "Web sitesi", href: info?.websiteUrl },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  return (
    <div className="mx-auto max-w-lg py-4 text-cream">
      <Link href={`/${business.slug}`} className="text-sm text-gold hover:underline">
        ← Geri
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{business.name}</h1>
      {info?.description && (
        <p className="mt-3 text-sm leading-relaxed text-cream-dim">{info.description}</p>
      )}

      <dl className="mt-6 space-y-3 text-sm">
        {info?.address && (
          <div>
            <dt className="text-cream-dim">Adres</dt>
            <dd className="mt-0.5">{info.address}</dd>
          </div>
        )}
        {info?.phone && (
          <div>
            <dt className="text-cream-dim">Telefon</dt>
            <dd className="mt-0.5">
              <a href={`tel:${info.phone}`} className="text-gold hover:underline">
                {info.phone}
              </a>
            </dd>
          </div>
        )}
        {hours && (
          <div>
            <dt className="text-cream-dim">Çalışma saatleri</dt>
            <dd className="mt-0.5">{hours}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-gold px-4 py-3 text-center font-semibold text-ink"
          >
            Yol Tarifi Al
          </a>
        )}
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-ink-line px-4 py-3 text-center text-gold transition-colors hover:border-gold-dark"
          >
            {l.label} →
          </a>
        ))}
      </div>
    </div>
  );
}
