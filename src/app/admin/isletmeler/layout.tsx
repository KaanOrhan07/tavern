import { AdminHeader } from "@/components/admin/AdminHeader";
import { IdleLogout } from "@/components/IdleLogout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <IdleLogout logoutUrl="/api/admin/logout" redirectUrl="/admin/giris" />
      <AdminHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
