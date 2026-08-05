import { NextResponse } from "next/server";
import {
  expirePendingAppointments,
  sendAppointmentReminders,
} from "@/lib/appointments";

/**
 * Cron / harici scheduler: Authorization: Bearer $CRON_SECRET
 * Süresi dolan talepleri expire eder + 30 dk hatırlatma gönderir.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET tanımlı değil" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const expired = await expirePendingAppointments();
  const reminders = await sendAppointmentReminders();
  return NextResponse.json({ ok: true, expired, reminders });
}

export async function GET(request: Request) {
  return POST(request);
}
