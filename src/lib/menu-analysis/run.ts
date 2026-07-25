import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { askGroqJson } from "@/lib/ai";
import {
  computeMenuMetrics,
  hasEnoughDataForAnalysis,
} from "@/lib/menu-analysis/metrics";

const menuAnalysisSchema = z.object({
  summary: z.string().max(1000),
  insights: z
    .array(
      z.object({
        type: z.enum([
          "BEST_SELLER",
          "LOW_SELLER",
          "HIGH_VIEW_LOW_CONVERSION",
          "CATEGORY_OPPORTUNITY",
          "BUNDLE_OPPORTUNITY",
          "TIME_PATTERN",
          "STOCK_RISK",
          "MENU_PLACEMENT",
        ]),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
        title: z.string().max(150),
        explanation: z.string().max(500),
        action: z.string().max(500),
        relatedProductIds: z.array(z.string()).max(10),
        confidence: z.number().min(0).max(1),
      })
    )
    .max(20),
});

export async function runMenuAnalysis(businessId: string) {
  const metrics = await computeMenuMetrics(businessId, 30);
  const periodStart = new Date(metrics.period.from);
  const periodEnd = new Date(metrics.period.to);

  if (!hasEnoughDataForAnalysis(metrics)) {
    const row = await prisma.menuAnalysis.create({
      data: {
        businessId,
        periodStart,
        periodEnd,
        inputData: metrics,
        status: "FAILED",
        errorCode: "INSUFFICIENT_DATA",
        completedAt: new Date(),
        resultData: {
          summary:
            "Güvenilir analiz için daha fazla sipariş verisi gerekiyor (min. 14 gün, 50 sipariş, 5 ürün).",
          insights: [],
        },
      },
    });
    return { ok: false as const, analysis: row, reason: "INSUFFICIENT_DATA" };
  }

  const pending = await prisma.menuAnalysis.create({
    data: {
      businessId,
      periodStart,
      periodEnd,
      inputData: metrics,
      status: "PENDING",
    },
  });

  try {
    const top = metrics.products.slice(0, 25);
    const ai = await askGroqJson<unknown>(
      "Sen bir restoran menü analisti olarak özet veriden kısa, uygulanabilir Türkçe öneriler üretirsin.",
      JSON.stringify({
        summary: metrics.summary,
        products: top,
        schemaHint:
          "{summary:string, insights:[{type,priority,title,explanation,action,relatedProductIds,confidence}]}",
      })
    );
    const parsed = menuAnalysisSchema.safeParse(ai);
    if (!parsed.success) {
      throw new Error("AI_OUTPUT_INVALID");
    }

    const completed = await prisma.menuAnalysis.update({
      where: { id: pending.id },
      data: {
        status: "COMPLETED",
        resultData: parsed.data,
        model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        completedAt: new Date(),
      },
    });
    return { ok: true as const, analysis: completed };
  } catch (err) {
    // Deterministik yedek: AI yoksa veya hata varsa basit insight
    const fallback = {
      summary: `Son 30 günde ${metrics.summary.orders} sipariş, ₺${(
        metrics.summary.revenueKurus / 100
      ).toFixed(0)} ciro.`,
      insights: metrics.products.slice(0, 5).map((p, i) => ({
        type: i === 0 ? ("BEST_SELLER" as const) : ("MENU_PLACEMENT" as const),
        priority: i === 0 ? ("HIGH" as const) : ("MEDIUM" as const),
        title: i === 0 ? `En çok satan: ${p.name}` : `${p.name} performansı`,
        explanation: `${p.unitsSold} adet, ₺${(p.revenueKurus / 100).toFixed(0)} ciro.`,
        action:
          i === 0
            ? "Menüde öne çıkarın ve stok takip edin."
            : "Fiyat veya konumunu gözden geçirin.",
        relatedProductIds: [p.productId],
        confidence: 0.6,
      })),
    };

    const completed = await prisma.menuAnalysis.update({
      where: { id: pending.id },
      data: {
        status: "COMPLETED",
        resultData: fallback,
        model: "deterministic-fallback",
        errorCode: err instanceof Error ? err.message.slice(0, 80) : "AI_ERROR",
        completedAt: new Date(),
      },
    });
    return { ok: true as const, analysis: completed, fallback: true };
  }
}
