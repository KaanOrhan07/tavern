"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type Expense = {
  id: string;
  category: string;
  title: string;
  amountKurus: number;
  expenseDate: string;
};

const CATEGORIES = [
  "RENT",
  "SALARY",
  "SUPPLIER",
  "UTILITIES",
  "TAX",
  "MAINTENANCE",
  "MARKETING",
  "OTHER",
] as const;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState({
    category: "OTHER",
    title: "",
    amountTl: "",
    expenseDate: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/panel/expenses");
    const data = await res.json().catch(() => null);
    setExpenses(data?.expenses ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountKurus = Math.round(Number(form.amountTl) * 100);
    if (!Number.isFinite(amountKurus) || amountKurus <= 0) {
      setError("Geçerli tutar girin");
      return;
    }
    const res = await fetch("/api/panel/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: form.category,
        title: form.title,
        amountKurus,
        expenseDate: form.expenseDate,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Kaydedilemedi");
      return;
    }
    setForm((f) => ({ ...f, title: "", amountTl: "" }));
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Giderler</h1>
        <p className="mt-1 text-sm text-cream-dim">
          Basit işletme gider takibi. Resmi mali müşavir raporu değildir.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Başlık</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Tutar (₺)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={form.amountTl}
              onChange={(e) => setForm({ ...form, amountTl: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Tarih</Label>
            <Input
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="sm:col-span-2">
            Gider Ekle
          </Button>
        </form>
      </Card>

      <Card className="p-0">
        <div className="divide-y divide-ink-line">
          {expenses.map((ex) => (
            <div key={ex.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{ex.title}</p>
                <p className="text-xs text-cream-dim">
                  {ex.category} · {new Date(ex.expenseDate).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <p className="text-sm">{formatKurus(ex.amountKurus)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
