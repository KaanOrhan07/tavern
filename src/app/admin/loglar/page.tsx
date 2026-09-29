import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { AdminLogs } from "@/components/admin/AdminLogs";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const session = await getAdminSession();
  if (session?.level !== "super") redirect("/admin/isletmeler");
  return <AdminLogs />;
}
