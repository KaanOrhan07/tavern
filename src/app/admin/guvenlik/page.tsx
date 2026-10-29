import { TwoFactorCard } from "@/components/admin/TwoFactorCard";

export const dynamic = "force-dynamic";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Hesap Güvenliği</h1>
      <TwoFactorCard />
    </div>
  );
}
