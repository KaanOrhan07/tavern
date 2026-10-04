import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanel, isGuardError } from "@/lib/guard";
import { isBarberBusiness } from "@/lib/business-modules";
import { writeAuditLog } from "@/lib/audit";
import { rateLimitAsync } from "@/lib/rate-limit";
import {
  MAX_FILE_BYTES,
  buildMenuWorkbook,
  importMenuRows,
  parseMenuWorkbook,
  type ImportReport,
} from "@/lib/menu-excel";

export const runtime = "nodejs";
export const maxDuration = 60;

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function guard() {
  const ctx = await requirePanel({ ownerOnly: true });
  if (isGuardError(ctx)) return ctx;
  const business = await prisma.business.findUnique({
    where: { id: ctx.business.id },
    select: { type: { select: { key: true } } },
  });
  if (!business || isBarberBusiness(business.type.key)) {
    return NextResponse.json({ error: "Menü Excel yalnızca restoran/kafe işletmeleri içindir" }, { status: 403 });
  }
  return ctx;
}

/** GET → mevcut menüyü Excel olarak indirir. GET ?template=1 → boş şablon. */
export async function GET(request: Request) {
  const ctx = await guard();
  if (ctx instanceof NextResponse) return ctx;

  const template = new URL(request.url).searchParams.get("template") === "1";
  const buffer = await buildMenuWorkbook(template ? null : ctx.business.id);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${template ? "tavern-menu-sablon" : "tavern-menu"}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

/** POST (multipart: file, dryRun=1|0) → Excel'den toplu ürün/kategori içe aktarır. */
export async function POST(request: Request) {
  const ctx = await guard();
  if (ctx instanceof NextResponse) return ctx;

  const limited = await rateLimitAsync(`menu-excel:${ctx.business.id}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) return NextResponse.json({ error: "Çok fazla deneme, biraz bekleyin" }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Excel dosyası seçin" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Dosya en fazla 2 MB olabilir" }, { status: 400 });
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return NextResponse.json({ error: "Yalnızca .xlsx (Excel) dosyası yükleyin" }, { status: 400 });
  }
  const dryRun = form?.get("dryRun") !== "0";

  const parsed = await parseMenuWorkbook(await file.arrayBuffer());
  if (parsed.fatal) {
    return NextResponse.json({ error: parsed.fatal }, { status: 400 });
  }

  const counts = parsed.rows.length
    ? await importMenuRows(ctx.business.id, parsed.rows, dryRun)
    : { created: 0, updated: 0, categoriesCreated: 0 };

  const report: ImportReport = {
    ok: true,
    dryRun,
    ...counts,
    errors: parsed.errors.slice(0, 100),
  };

  if (!dryRun) {
    await writeAuditLog({
      businessId: ctx.business.id,
      session: ctx.session,
      action: "CREATE",
      entityType: "MenuExcelImport",
      metadata: { ...counts, errorCount: parsed.errors.length, fileName: file.name.slice(0, 100) },
    });
  }
  return NextResponse.json(report);
}
