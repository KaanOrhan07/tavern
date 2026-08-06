import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { getBusinessHistoryForCustomer } from "@/lib/customer-home";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { slug } = await params;
  const data = await getBusinessHistoryForCustomer({
    phone: session.phone,
    profileId: session.profileId,
    businessSlug: slug,
  });
  if (!data) {
    return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...data });
}
