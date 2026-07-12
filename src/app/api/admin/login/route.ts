import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession } from "@/lib/auth";

const schema = z.object({ key: z.string().min(1) });

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || body.data.key !== adminKey) {
    return NextResponse.json({ error: "Geçersiz anahtar" }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
