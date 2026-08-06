import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { getCustomerHomePayload } from "@/lib/customer-home";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const payload = await getCustomerHomePayload(session.profileId, session.phone);
  if (!payload) {
    return NextResponse.json({ error: "Hesap bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...payload });
}
