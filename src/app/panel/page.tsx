"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input, Label, TavernLogo } from "@/components/ui";
import { slugify } from "@/lib/utils";

function EntryForm() {
  const router = useRouter();
  const search = useSearchParams();
  const role = search.get("rol") === "staff" ? "staff" : "owner";
  const [slug, setSlug] = useState("");

  return (
    <Card className="w-full max-w-sm">
      <div className="mb-6 mt-2">
        <TavernLogo size="md" />
        <p className="mt-2 text-center text-xs text-cream-dim">
          {role === "staff" ? "Personel Girişi" : "İşletme Girişi"}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (slug) router.push(`/panel/${slugify(slug)}/giris?rol=${role}`);
        }}
        className="space-y-4"
      >
        <div>
          <Label>İşletme Adresi</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ör: kosk-kafe"
            autoFocus
            required
          />
          <p className="mt-1.5 text-xs text-cream-dim/70">İşletmenizin size verilen kısa adresini yazın.</p>
        </div>
        <Button type="submit" disabled={!slug} className="w-full">
          Devam Et
        </Button>
      </form>
    </Card>
  );
}

export default function PanelEntryPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <EntryForm />
      </Suspense>
    </main>
  );
}
