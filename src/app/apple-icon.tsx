import { readFile } from "fs/promises";
import path from "path";

export const contentType = "image/png";

export default async function AppleIcon() {
  const file = await readFile(
    path.join(process.cwd(), "public", "tavern-logo.png")
  );
  return new Response(file, {
    headers: { "Content-Type": "image/png" },
  });
}
