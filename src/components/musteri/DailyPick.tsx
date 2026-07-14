import Link from "next/link";
import { formatKurus } from "@/lib/utils";
import { ProductImage } from "@/components/musteri/ProductImage";

type Pick = {
  name: string;
  slug: string;
  priceKurus: number;
  imageUrl: string;
  description: string | null;
};

export function DailyPick({
  product,
  isletmeSlug,
  masa,
}: {
  product: Pick;
  isletmeSlug: string;
  masa?: string | null;
}) {
  const href = masa
    ? `/${isletmeSlug}/menu/${product.slug}?masa=${masa}`
    : `/${isletmeSlug}/menu/${product.slug}`;

  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-xl border border-gold/40 bg-gold/5 p-4 transition-colors hover:border-gold"
    >
      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        className="h-16 w-16 shrink-0 rounded-lg bg-ink-soft object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-wide text-gold">⭐ Günün Önerisi</p>
        <p className="mt-0.5 font-medium">{product.name}</p>
        {product.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-cream-dim">{product.description}</p>
        )}
        <p className="mt-1 text-sm font-semibold text-gold">{formatKurus(product.priceKurus)}</p>
      </div>
    </Link>
  );
}
