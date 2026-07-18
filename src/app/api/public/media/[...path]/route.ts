import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";

/** Path traversal ve rastgele erişimi engelle: businessId/...webp */
const PATH_RE = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.\-\/]+\.webp$/;

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase ortam değişkenleri eksik");
  return createClient(url, key);
}

/**
 * Ürün/logo görsellerini service role ile stream eder.
 * Bucket private olsa bile menüde fotoğraf görünür.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;
  const path = parts.map(decodeURIComponent).join("/");
  if (!PATH_RE.test(path)) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) {
      return NextResponse.json({ error: "Görsel bulunamadı" }, { status: 404 });
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Görsel yüklenemedi" }, { status: 500 });
  }
}
