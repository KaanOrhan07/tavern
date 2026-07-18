import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { mediaProxyUrl } from "@/lib/storage-url";

const BUCKET = "product-images";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase ortam değişkenleri eksik");
  return createClient(url, key);
}

async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return await sharp(buffer)
      .rotate()
      .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  } catch {
    throw new Error(
      "Fotoğraf işlenemedi. Lütfen JPEG veya PNG formatında yükleyin (iPhone HEIC desteklenmeyebilir)."
    );
  }
}

/**
 * Ürün fotoğrafını sıkıştırıp (max 800px, webp) Supabase Storage'a yükler.
 * Menüde güvenilir görünsün diye uygulama proxy URL'si döndürür.
 */
export async function uploadProductImage(
  businessId: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file, 800, 800, 80);
  const path = `${businessId}/${crypto.randomUUID()}.webp`;
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new Error(`Fotoğraf yüklenemedi: ${error.message}`);

  return mediaProxyUrl(path);
}

/** İşletme logo veya banner görseli yükler. */
export async function uploadBusinessImage(
  businessId: string,
  file: File,
  kind: "logo" | "banner"
): Promise<string> {
  const compressed = await compressImage(
    file,
    kind === "logo" ? 400 : 1200,
    kind === "logo" ? 400 : 600,
    82
  );

  const path = `${businessId}/brand/${kind}-${crypto.randomUUID()}.webp`;
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new Error(`Görsel yüklenemedi: ${error.message}`);

  return mediaProxyUrl(path);
}
