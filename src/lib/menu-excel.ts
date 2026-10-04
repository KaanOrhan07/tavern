import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/** Menü Excel şablonu — sütun sırası sabit; ilk satır başlık. */
export const MENU_SHEET = "Menü";
export const COLUMNS = ["Kategori", "Ürün Adı", "Fiyat (₺)", "Açıklama", "Aktif", "Varyantlar"] as const;

export const MAX_ROWS = 1000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

// ---------- Hücre yardımcıları ----------

/** Excel'in `=`, `+`, `-`, `@` ile başlayan metni formül sayması (CSV/formula injection) engellenir. */
function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.replace(/^'/, "").trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("").trim();
    if ("result" in v && v.result !== undefined && v.result !== null) return cellText(v.result as ExcelJS.CellValue);
    if ("text" in v && typeof v.text === "string") return v.text.trim();
  }
  return "";
}

/** "125", "125,50", "1.250,50", "125.5" → kuruş. Sayısal hücre doğrudan işlenir. */
export function parsePriceKurus(v: ExcelJS.CellValue): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) && v >= 0 && v <= 1_000_000 ? Math.round(v * 100) : null;
  }
  let s = cellText(v).replace(/[₺\s]|TL/gi, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", "."); // Türkçe biçim: 1.250,50
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, ""); // 1.250.000
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? Math.round(n * 100) : null;
}

function parseActive(v: ExcelJS.CellValue): boolean | null {
  const s = cellText(v).toLowerCase();
  if (!s) return true; // boş = aktif
  if (["evet", "e", "1", "true", "aktif", "yes", "x"].includes(s)) return true;
  if (["hayır", "hayir", "h", "0", "false", "pasif", "no"].includes(s)) return false;
  return null;
}

/** "Küçük=90; Büyük=120" veya satır sonuyla ayrılmış → [{name, priceKurus}] */
export function parseVariants(
  v: ExcelJS.CellValue
): { variants: { name: string; priceKurus: number }[]; error?: string } {
  const raw = cellText(v);
  if (!raw) return { variants: [] };
  const variants: { name: string; priceKurus: number }[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[;\n]+/).map((p) => p.trim()).filter(Boolean)) {
    const idx = part.lastIndexOf("=");
    if (idx < 1) return { variants: [], error: `Varyant biçimi hatalı: "${part}" (Ad=Fiyat olmalı)` };
    const name = part.slice(0, idx).trim();
    const price = parsePriceKurus(part.slice(idx + 1));
    if (!name || price === null || price <= 0) {
      return { variants: [], error: `Varyant fiyatı hatalı: "${part}"` };
    }
    if (seen.has(name.toLowerCase())) return { variants: [], error: `Aynı varyant iki kez yazılmış: "${name}"` };
    seen.add(name.toLowerCase());
    variants.push({ name: name.slice(0, 60), priceKurus: price });
  }
  return { variants };
}

// ---------- Dışa aktarma ----------

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7A2EC4" } };
  header.alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns = [
    { width: 22 },
    { width: 34 },
    { width: 14 },
    { width: 48 },
    { width: 10 },
    { width: 40 },
  ];
}

function addHelpSheet(wb: ExcelJS.Workbook) {
  const help = wb.addWorksheet("Nasıl kullanılır");
  help.getColumn(1).width = 110;
  [
    "TAVERN MENÜ EXCEL ŞABLONU",
    "",
    "• Her satır bir üründür. Kategori yoksa otomatik oluşturulur.",
    "• Aynı Kategori + Ürün Adı zaten varsa o ürün GÜNCELLENİR (fiyat, açıklama, aktiflik, varyant); yoksa yeni eklenir.",
    "• Fiyat: 125 veya 125,50 (₺ işareti yazmayın).",
    "• Aktif: Evet / Hayır (boşsa Evet).",
    "• Varyantlar: Ad=Fiyat biçiminde, noktalı virgülle ayırın. Örnek: Küçük=90; Büyük=120",
    "   Varyant hücresi boşsa mevcut ürünün varyantlarına dokunulmaz; yeni üründe varyant olmaz.",
    "• Fotoğraf ve reçete Excel'den eklenemez; ürünleri aktardıktan sonra Menü sayfasından fotoğraf/reçete ekleyin.",
    "• Silme yapılmaz: Excel'de olmayan ürünler menüde kalır. Bir ürünü kaldırmak için Aktif = Hayır yazın.",
    "• En fazla 1000 satır, dosya boyutu en fazla 2 MB. İlk sayfanın başlık satırını değiştirmeyin.",
  ].forEach((line, i) => {
    const row = help.getRow(i + 1);
    row.getCell(1).value = line;
    if (i === 0) row.font = { bold: true, size: 14 };
  });
}

export async function buildMenuWorkbook(businessId: string | null): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tavern — Digio Medya ve Yazılım";
  const sheet = wb.addWorksheet(MENU_SHEET);
  sheet.addRow([...COLUMNS]);
  styleHeader(sheet);

  if (businessId) {
    const categories = await prisma.category.findMany({
      where: { businessId },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          orderBy: { name: "asc" },
          include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    for (const c of categories) {
      for (const p of c.products) {
        sheet.addRow([
          safeCell(c.name),
          safeCell(p.name),
          p.priceKurus / 100,
          safeCell(p.description ?? ""),
          p.active ? "Evet" : "Hayır",
          safeCell(p.variants.map((v) => `${v.name}=${(v.priceKurus / 100).toString().replace(".", ",")}`).join("; ")),
        ]);
      }
    }
  } else {
    // Şablon: örnek satırlar
    sheet.addRow(["Sıcak İçecekler", "Türk Kahvesi", 85, "Közde, orta şekerli", "Evet", ""]);
    sheet.addRow(["Sıcak İçecekler", "Latte", 110, "Süt ve espresso", "Evet", "Küçük=95; Büyük=125"]);
    sheet.addRow(["Tatlılar", "Cheesecake", 160, "Frambuaz soslu", "Evet", ""]);
  }
  sheet.getColumn(3).numFmt = "#,##0.00";
  addHelpSheet(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------- İçe aktarma ----------

export type ImportRow = {
  row: number;
  category: string;
  name: string;
  priceKurus: number;
  description: string | null;
  active: boolean;
  variants: { name: string; priceKurus: number }[];
  /** null → varyant hücresi boş, mevcut varyantlara dokunma */
  variantsProvided: boolean;
};

export type ImportReport = {
  ok: boolean;
  dryRun: boolean;
  created: number;
  updated: number;
  categoriesCreated: number;
  errors: { row: number; message: string }[];
  fatal?: string;
};

export async function parseMenuWorkbook(
  buffer: ArrayBuffer
): Promise<{ rows: ImportRow[]; errors: { row: number; message: string }[]; fatal?: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return { rows: [], errors: [], fatal: "Dosya okunamadı. Lütfen .xlsx formatında (Excel) bir dosya yükleyin." };
  }
  const sheet = wb.getWorksheet(MENU_SHEET) ?? wb.worksheets[0];
  if (!sheet) return { rows: [], errors: [], fatal: "Excel dosyasında sayfa bulunamadı." };

  const headers = COLUMNS.map((_, i) => cellText(sheet.getRow(1).getCell(i + 1).value).toLowerCase());
  const expected = COLUMNS.map((c) => c.toLowerCase());
  if (headers.slice(0, 3).join("|") !== expected.slice(0, 3).join("|")) {
    return {
      rows: [],
      errors: [],
      fatal: "Başlık satırı beklenen biçimde değil. Lütfen 'Şablonu indir' ile aldığınız dosyayı kullanın.",
    };
  }
  if (sheet.rowCount - 1 > MAX_ROWS + 50) {
    return { rows: [], errors: [], fatal: `En fazla ${MAX_ROWS} satır aktarılabilir.` };
  }

  const rows: ImportRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const seen = new Set<string>();

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const category = cellText(row.getCell(1).value);
    const name = cellText(row.getCell(2).value);
    const priceCell = row.getCell(3).value;
    if (!category && !name && !cellText(priceCell)) continue; // boş satır

    if (rows.length >= MAX_ROWS) {
      errors.push({ row: r, message: `En fazla ${MAX_ROWS} satır işlenir; kalan satırlar atlandı` });
      break;
    }
    if (!category) { errors.push({ row: r, message: "Kategori boş" }); continue; }
    if (!name) { errors.push({ row: r, message: "Ürün adı boş" }); continue; }
    if (category.length > 60) { errors.push({ row: r, message: "Kategori adı 60 karakterden uzun" }); continue; }
    if (name.length > 120) { errors.push({ row: r, message: "Ürün adı 120 karakterden uzun" }); continue; }
    const priceKurus = parsePriceKurus(priceCell);
    if (priceKurus === null) { errors.push({ row: r, message: `Fiyat geçersiz: "${cellText(priceCell)}"` }); continue; }
    const active = parseActive(row.getCell(5).value);
    if (active === null) { errors.push({ row: r, message: "Aktif sütunu Evet/Hayır olmalı" }); continue; }
    const variantsParsed = parseVariants(row.getCell(6).value);
    if (variantsParsed.error) { errors.push({ row: r, message: variantsParsed.error }); continue; }

    const key = `${category.toLowerCase()}|${name.toLowerCase()}`;
    if (seen.has(key)) { errors.push({ row: r, message: "Aynı kategori + ürün adı dosyada birden fazla kez geçiyor" }); continue; }
    seen.add(key);

    const description = cellText(row.getCell(4).value).slice(0, 1000) || null;
    rows.push({
      row: r,
      category,
      name,
      priceKurus,
      description,
      active,
      variants: variantsParsed.variants,
      variantsProvided: cellText(row.getCell(6).value) !== "",
    });
  }
  return { rows, errors };
}

export async function importMenuRows(
  businessId: string,
  rows: ImportRow[],
  dryRun: boolean
): Promise<Pick<ImportReport, "created" | "updated" | "categoriesCreated">> {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { businessId }, select: { id: true, name: true, slug: true, sortOrder: true } }),
    prisma.product.findMany({ where: { businessId }, select: { id: true, name: true, slug: true, categoryId: true } }),
  ]);
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const catSlugs = new Set(categories.map((c) => c.slug));
  const prodSlugs = new Set(products.map((p) => p.slug));
  const prodByKey = new Map(products.map((p) => [`${p.categoryId}|${p.name.toLowerCase()}`, p]));
  let nextSort = Math.max(0, ...categories.map((c) => c.sortOrder)) + 1;

  const uniqueSlug = (base: string, used: Set<string>) => {
    let slug = base || "urun";
    for (let i = 2; used.has(slug); i++) slug = `${base || "urun"}-${i}`;
    used.add(slug);
    return slug;
  };

  let created = 0;
  let updated = 0;
  let categoriesCreated = 0;

  // Önce hangi işlemlerin yapılacağını planla (dryRun'da DB'ye yazma)
  const plan: { row: ImportRow; catKey: string; existingId: string | null }[] = [];
  const newCategories: { name: string }[] = [];
  const virtualCats = new Map<string, true>();
  for (const row of rows) {
    const catKey = row.category.toLowerCase();
    const cat = catByName.get(catKey);
    if (!cat && !virtualCats.has(catKey)) {
      virtualCats.set(catKey, true);
      newCategories.push({ name: row.category });
    }
    const existing = cat ? prodByKey.get(`${cat.id}|${row.name.toLowerCase()}`) : undefined;
    plan.push({ row, catKey, existingId: existing?.id ?? null });
  }
  categoriesCreated = newCategories.length;
  created = plan.filter((p) => !p.existingId).length;
  updated = plan.length - created;
  if (dryRun) return { created, updated, categoriesCreated };

  await prisma.$transaction(
    async (tx) => {
      for (const c of newCategories) {
        const row = await tx.category.create({
          data: {
            businessId,
            name: c.name,
            slug: uniqueSlug(slugify(c.name) || "kategori", catSlugs),
            sortOrder: nextSort++,
          },
          select: { id: true, name: true, slug: true, sortOrder: true },
        });
        catByName.set(c.name.toLowerCase(), row);
      }
      for (const { row, catKey, existingId } of plan) {
        const cat = catByName.get(catKey)!;
        let productId = existingId;
        if (existingId) {
          await tx.product.update({
            where: { id: existingId },
            data: { priceKurus: row.priceKurus, description: row.description, active: row.active },
          });
        } else {
          const p = await tx.product.create({
            data: {
              businessId,
              categoryId: cat.id,
              name: row.name,
              slug: uniqueSlug(slugify(row.name), prodSlugs),
              priceKurus: row.priceKurus,
              description: row.description,
              imageUrl: "", // fotoğraf Excel'den eklenemez; ürün kartında yer tutucu gösterilir
              active: row.active,
            },
            select: { id: true },
          });
          productId = p.id;
        }
        if (row.variantsProvided || !existingId) {
          if (existingId) await tx.productVariant.deleteMany({ where: { productId: productId! } });
          if (row.variants.length > 0) {
            await tx.productVariant.createMany({
              data: row.variants.map((v, i) => ({
                productId: productId!,
                name: v.name,
                priceKurus: v.priceKurus,
                sortOrder: i,
              })),
            });
          }
        }
      }
    },
    { timeout: 60_000, maxWait: 10_000 }
  );
  return { created, updated, categoriesCreated };
}
