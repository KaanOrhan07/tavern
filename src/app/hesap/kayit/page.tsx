import { redirect } from "next/navigation";

export default async function HesapKayitRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  redirect(`/panel/kayit-ol${q}`);
}
