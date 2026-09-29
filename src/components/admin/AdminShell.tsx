import { getAdminSession } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { IdleLogout } from "@/components/IdleLogout";

/** Tüm /admin bölümlerinin ortak çerçevesi: oturum seviyesine göre menü gösterir. */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  return (
    <div className="flex min-h-screen flex-col">
      <IdleLogout logoutUrl="/api/admin/logout" redirectUrl="/admin/giris" />
      <AdminHeader level={session?.level ?? "sub"} adminName={session?.adminName ?? ""} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
