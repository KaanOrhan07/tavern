import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { AdminsManager } from "@/components/admin/AdminsManager";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const session = await getAdminSession();
  if (session?.level !== "super") redirect("/admin/isletmeler");
  return <AdminsManager />;
}
