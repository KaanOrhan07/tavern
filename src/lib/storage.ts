import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "product-images";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase ortam değişkenleri eksik");
  return createClient(url, key);
}

/**
 * Ürün fotoğrafını sıkıştırıp (max 800px, webp) Supabase Storage'a yükler.
 * Herkese açık URL döndürür.
 */
export async function uploadProductImage(
  businessId: string,
  file: File
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const compressed = await sharp(buffer)
    .rotate() // EXIF yönünü uygula
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const path = `${businessId}/${crypto.randomUUID()}.webp`;
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: "image/webp" });
  if (error) throw new Error(`Fotoğraf yüklenemedi: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** İşletme logo veya banner görseli yükler. */
export async function uploadBusinessImage(
  businessId: string,
  file: File,
  kind: "logo" | "banner"
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const compressed = await sharp(buffer)
    .rotate()
    .resize(kind === "logo" ? 400 : 1200, kind === "logo" ? 400 : 600, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  const path = `${businessId}/brand/${kind}-${crypto.randomUUID()}.webp`;
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: "image/webp" });
  if (error) throw new Error(`Görsel yüklenemedi: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
