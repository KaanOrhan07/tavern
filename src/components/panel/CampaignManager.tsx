"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Input, Label, Select } from "@/components/ui";

type CampaignTranslation = {
  locale: string;
  title: string;
  description: string | null;
  buttonText: string | null;
};

type Campaign = {
  id: string;
  displayType: "BANNER" | "POPUP";
  active: boolean;
  startsAt: string;
  endsAt: string;
  translations: CampaignTranslation[];
};

function formatRange(startsAt: string, endsAt: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${new Date(startsAt).toLocaleString("tr-TR", opts)} – ${new Date(endsAt).toLocaleString("tr-TR", opts)}`;
}

export function CampaignManager({ campaigns }: { campaigns: Campaign[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    displayType: "POPUP" as "BANNER" | "POPUP",
    startsAt: "",
    endsAt: "",
  });

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/panel/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          displayType: form.displayType,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      });
      if (res.ok) {
        setForm({ title: "", displayType: "POPUP", startsAt: "", endsAt: "" });
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Kampanya oluşturulamadı");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(campaign: Campaign) {
    await fetch(`/api/panel/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !campaign.active }),
    });
    router.refresh();
  }

  async function deleteCampaign(campaign: Campaign) {
    const title = campaign.translations[0]?.title ?? "Kampanya";
    if (!confirm(`"${title}" silinsin mi?`)) return;
    const res = await fetch(`/api/panel/campaigns/${campaign.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Kampanya silinemedi");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Kampanyalar</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Müşteri menüsünde banner veya popup olarak gösterilecek kampanyalar.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <p className="mb-4 font-medium">Yeni Kampanya</p>
        <form onSubmit={createCampaign} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Başlık</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ör: Yaz indirimi"
              required
              minLength={1}
            />
          </div>
          <div>
            <Label>Gösterim tipi</Label>
            <Select
              value={form.displayType}
              onChange={(e) =>
                setForm({ ...form, displayType: e.target.value as "BANNER" | "POPUP" })
              }
            >
              <option value="POPUP">Popup</option>
              <option value="BANNER">Banner</option>
            </Select>
          </div>
          <div />
          <div>
            <Label>Başlangıç</Label>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Bitiş</Label>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Kaydediliyor…" : "Kampanya Ekle"}
            </Button>
          </div>
        </form>
      </Card>

      {campaigns.length === 0 ? (
        <EmptyState title="Henüz kampanya yok" description="Yukarıdaki formdan ilk kampanyanızı oluşturun." />
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const title = campaign.translations.find((t) => t.locale === "TR")?.title
              ?? campaign.translations[0]?.title
              ?? "—";
            return (
              <Card key={campaign.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{title}</p>
                    <Badge tone={campaign.displayType === "POPUP" ? "gold" : "neutral"}>
                      {campaign.displayType === "POPUP" ? "Popup" : "Banner"}
                    </Badge>
                    <Badge tone={campaign.active ? "ok" : "neutral"}>
                      {campaign.active ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-cream-dim">
                    {formatRange(campaign.startsAt, campaign.endsAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => toggleActive(campaign)}
                  >
                    {campaign.active ? "Pasifleştir" : "Aktifleştir"}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => deleteCampaign(campaign)}
                  >
                    Sil
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
