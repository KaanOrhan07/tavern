import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { defaultCustomerPath } from "@/lib/business-modules";
import { toDisplayImageUrl } from "@/lib/storage-url";

export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ isletmeSlug: string }>;
}) {
  const { isletmeSlug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug: isletmeSlug },
    select: {
      name: true,
      active: true,
      theme: true,
      logoUrl: true,
      type: { select: { key: true } },
    },
  });
  if (!business || !business.active) notFound();

  const homeHref = defaultCustomerPath(isletmeSlug, business.type.key);
  const logoUrl = business.logoUrl ? toDisplayImageUrl(business.logoUrl) : null;

  return (
    <div
      data-tavern-theme={business.theme.toLowerCase()}
      className="flex min-h-dvh flex-col overflow-x-hidden bg-ink text-cream"
    >
      <header className="sticky top-0 z-20 border-b border-ink-line bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/90">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={business.name}
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
              unoptimized={logoUrl.startsWith("/api/")}
            />
          ) : null}
          <Link href={homeHref} className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium">{business.name}</p>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 overflow-x-hidden px-4 pt-3 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
    </div>
  );
}
