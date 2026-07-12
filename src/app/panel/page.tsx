"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, TavernLogo } from "@/components/ui";
import { slugify } from "@/lib/utils";

export default function PanelEntryPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <div className="mb-6 mt-2">
          <TavernLogo size="md" showTagline />
          <p className="mt-2 text-center text-xs text-cream-dim">
            İşletme Paneli
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (slug) router.push(`/panel/${slugify(slug)}/giris`);
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
            <p className="mt-1.5 text-xs text-cream-dim/70">
              İşletmenizin size verilen kısa adresini yazın.
            </p>
          </div>
          <Button type="submit" disabled={!slug} className="w-full">
            Devam Et
          </Button>
        </form>
      </Card>
    </main>
  );
}
