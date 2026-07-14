import { readFile } from "fs/promises";
import path from "path";

export const contentType = "image/png";

// public/tavern-logo.png'yi favicon olarak sunar; Next.js'in varsayılan
// (boş) favicon.ico'sunun tarayıcıda öncelikli görünmesini engeller.
export default async function Icon() {
  const file = await readFile(
    path.join(process.cwd(), "public", "tavern-logo.png")
  );
  return new Response(file, {
    headers: { "Content-Type": "image/png" },
  });
}
