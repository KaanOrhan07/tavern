"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";

type Insight = {
  title: string;
  explanation: string;
  action: string;
  priority: string;
};

export default function AnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  async function loadLatest() {
    const res = await fetch("/api/panel/analysis/menu");
    const data = await res.json().catch(() => null);
    const result = data?.analysis?.resultData;
    if (result) {
      setSummary(result.summary ?? null);
      setInsights(result.insights ?? []);
    }
  }

  useEffect(() => {
    loadLatest();
  }, []);

  async function run() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/panel/analysis/menu", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Analiz çalıştırılamadı");
    } else if (data?.reason === "INSUFFICIENT_DATA") {
      setSummary(data.analysis?.resultData?.summary ?? "Yetersiz veri");
      setInsights([]);
    } else {
      setSummary(data.analysis?.resultData?.summary ?? null);
      setInsights(data.analysis?.resultData?.insights ?? []);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Menü Analizi</h1>
          <p className="mt-1 text-sm text-cream-dim">
            Sipariş verisine dayalı öneriler. Yetersiz veride analiz zorlanmaz.
          </p>
        </div>
        <Button onClick={run} disabled={loading}>
          {loading ? "Analiz ediliyor..." : "Analizi Çalıştır"}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {summary && (
        <Card>
          <p className="text-sm leading-relaxed text-cream">{summary}</p>
        </Card>
      )}

      <div className="grid gap-3">
        {insights.map((insight, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{insight.title}</p>
              <span className="text-xs text-cream-dim">{insight.priority}</span>
            </div>
            <p className="mt-2 text-sm text-cream-dim">{insight.explanation}</p>
            <p className="mt-2 text-sm text-gold">{insight.action}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
