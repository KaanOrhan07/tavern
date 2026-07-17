import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { defaultCustomerPath } from "@/lib/business-modules";

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
      bannerUrl: true,
      type: { select: { key: true } },
    },
  });
  if (!business || !business.active) notFound();

  const homeHref = defaultCustomerPath(isletmeSlug, business.type.key);

  return (
    <div
      data-tavern-theme={business.theme.toLowerCase()}
      className="flex min-h-screen flex-col bg-ink text-cream"
    >
      {business.bannerUrl && (
        <div className="relative h-32 w-full overflow-hidden sm:h-40">
          <Image
            src={business.bannerUrl}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-ink-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          {business.logoUrl ? (
            <Image
              src={business.logoUrl}
              alt={business.name}
              width={48}
              height={48}
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          ) : null}
          <Link href={homeHref} className="min-w-0 flex-1">
            <p className="truncate font-medium">{business.name}</p>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>
    </div>
  );
}
