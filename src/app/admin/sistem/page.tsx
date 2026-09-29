import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { SystemSettings } from "@/components/admin/SystemSettings";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const session = await getAdminSession();
  if (session?.level !== "super") redirect("/admin/isletmeler");
  return <SystemSettings />;
}
