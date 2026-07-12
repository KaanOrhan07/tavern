import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
    select: { name: true, active: true },
  });
  if (!business || !business.active) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-ink-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5">
          <Link href={`/${isletmeSlug}/menu`} className="min-w-0">
            <p className="truncate font-medium">{business.name}</p>
          </Link>
          <Link href={`/${isletmeSlug}/menu`} className="shrink-0">
            <Image
              src="/tavern-logo.png"
              alt="Tavern"
              width={72}
              height={48}
              className="h-8 w-auto opacity-90"
            />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>
    </div>
  );
}
