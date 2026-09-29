import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { DailyReportData } from "@/lib/reports/daily-report";

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 44;
const GOLD = rgb(0.647, 0.235, 1); // Tavern moru (#A53CFF)
const INK = rgb(0.1, 0.1, 0.12);
const DIM = rgb(0.4, 0.4, 0.45);
const LINE = rgb(0.85, 0.85, 0.88);

const tl = (kurus: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);

function fmtAmount(amount: number, unit: string) {
  if (unit === "g" && amount >= 1000) return `${(amount / 1000).toFixed(2)} kg`;
  if (unit === "ml" && amount >= 1000) return `${(amount / 1000).toFixed(2)} lt`;
  return `${Math.round(amount * 100) / 100} ${unit}`;
}

/** Türkçe karakterleri (ş, ğ, ı, İ…) destekleyen gömülü DejaVu Sans ile A4 günlük rapor PDF'i üretir. */
export async function buildDailyReportPdf(data: DailyReportData): Promise<Uint8Array> {
  const fontDir = path.join(process.cwd(), "src", "assets", "fonts");
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(fontDir, "DejaVuSans.ttf")),
    readFile(path.join(fontDir, "DejaVuSans-Bold.ttf")),
  ]);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Günlük Rapor — ${data.businessName}`);
  doc.setCreator("Tavern — Digio Medya ve Yazılım");
  const font = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const fit = (text: string, f: PDFFont, size: number, maxW: number) => {
    let t = text;
    while (t.length > 1 && f.widthOfTextAtSize(t, size) > maxW) t = t.slice(0, -1);
    return t === text ? t : `${t.slice(0, -1)}…`;
  };
  const ensure = (needed: number) => {
    if (y - needed < MARGIN + 20) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };
  const text = (s: string, x: number, size = 10, f: PDFFont = font, color = INK) =>
    page.drawText(s, { x, y, size, font: f, color });
  const rightText = (s: string, xRight: number, size = 10, f: PDFFont = font) =>
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y, size, font: f, color: INK });

  // --- Başlık ---
  text("TAVERN", MARGIN, 11, bold, GOLD);
  y -= 26;
  text("Günlük Rapor", MARGIN, 22, bold);
  y -= 20;
  text(`${data.businessName} · ${data.dateLabel}`, MARGIN, 11, font, DIM);
  y -= 26;

  // --- Özet kutuları ---
  const boxes = [
    { label: "Toplam Ciro", value: tl(data.totalKurus) },
    { label: "Nakit", value: tl(data.cashKurus) },
    { label: "Kart", value: tl(data.cardKurus) },
    { label: "Sipariş / Ödeme", value: `${data.orderCount} / ${data.paymentCount}` },
  ];
  const gap = 8;
  const boxW = (PAGE_W - MARGIN * 2 - gap * 3) / 4;
  boxes.forEach((b, i) => {
    const x = MARGIN + i * (boxW + gap);
    page.drawRectangle({ x, y: y - 44, width: boxW, height: 50, borderColor: LINE, borderWidth: 1 });
    page.drawText(b.label, { x: x + 8, y: y - 8, size: 8, font, color: DIM });
    page.drawText(fit(b.value, bold, 12, boxW - 16), { x: x + 8, y: y - 28, size: 12, font: bold, color: INK });
  });
  y -= 70;

  // --- Tablo yardımcısı ---
  const section = (
    title: string,
    columns: { header: string; width: number; align?: "right" }[],
    rows: string[][],
    empty: string
  ) => {
    ensure(50);
    text(title, MARGIN, 13, bold, GOLD);
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: LINE });
    y -= 16;
    if (rows.length === 0) {
      text(empty, MARGIN, 10, font, DIM);
      y -= 26;
      return;
    }
    const totalW = PAGE_W - MARGIN * 2;
    const xs: number[] = [];
    let acc = MARGIN;
    for (const c of columns) {
      xs.push(acc);
      acc += c.width * totalW;
    }
    const drawRow = (cells: string[], f: PDFFont, color = INK) => {
      cells.forEach((cell, i) => {
        const col = columns[i]!;
        const w = col.width * totalW - 8;
        const s = fit(cell, f, 9.5, w);
        if (col.align === "right") {
          page.drawText(s, { x: xs[i]! + col.width * totalW - 8 - f.widthOfTextAtSize(s, 9.5), y, size: 9.5, font: f, color });
        } else {
          page.drawText(s, { x: xs[i]!, y, size: 9.5, font: f, color });
        }
      });
    };
    drawRow(columns.map((c) => c.header), bold, DIM);
    y -= 14;
    for (const r of rows) {
      ensure(16);
      drawRow(r, font);
      y -= 14;
    }
    y -= 14;
  };

  section(
    "Ürün Bazlı Satışlar",
    [
      { header: "Ürün", width: 0.55 },
      { header: "Adet", width: 0.15, align: "right" },
      { header: "Tutar", width: 0.3, align: "right" },
    ],
    data.products.map((p) => [p.name, String(p.quantity), tl(p.revenueKurus)]),
    "Bugün satış yok"
  );

  section(
    "Personel Bazlı Sipariş Sayısı",
    [
      { header: "Personel", width: 0.6 },
      { header: "Sipariş", width: 0.2, align: "right" },
      { header: "Ürün adedi", width: 0.2, align: "right" },
    ],
    data.staff.map((s) => [s.name, String(s.orderCount), String(s.itemCount)]),
    "Bugün sipariş yok"
  );

  section(
    "Harcanan Malzemeler (reçeteye göre tahmini)",
    [
      { header: "Malzeme", width: 0.65 },
      { header: "Miktar", width: 0.35, align: "right" },
    ],
    data.ingredients.map((i) => [i.name, fmtAmount(i.amount, i.unit)]),
    "Reçeteli ürün satışı yok"
  );

  // --- Alt bilgi (her sayfa) ---
  const stamp = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(data.generatedAt);
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Tavern · Digio Medya ve Yazılım · ${stamp}`, { x: MARGIN, y: 24, size: 8, font, color: DIM });
    const label = `${i + 1} / ${pages.length}`;
    p.drawText(label, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, 8), y: 24, size: 8, font, color: DIM });
  });

  void rightText;
  return doc.save();
}
