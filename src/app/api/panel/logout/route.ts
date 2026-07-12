import { NextResponse } from "next/server";
import { destroyPanelSession } from "@/lib/auth";

export async function POST() {
  await destroyPanelSession();
  return NextResponse.json({ ok: true });
}
