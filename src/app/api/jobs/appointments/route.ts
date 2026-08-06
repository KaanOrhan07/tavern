import { NextResponse } from "next/server";
import {
  archiveAllPastAppointments,
  expirePendingAppointments,
  sendAppointmentReminders,
} from "@/lib/appointments";

/**
 * Cron / harici scheduler: Authorization: Bearer $CRON_SECRET
 * Expire + hatırlatma + gün sonu arşivi.
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

  const [expired, reminders, archived] = await Promise.all([
    expirePendingAppointments(),
    sendAppointmentReminders(),
    archiveAllPastAppointments(),
  ]);
  return NextResponse.json({ ok: true, expired, reminders, archived });
}

export async function GET(request: Request) {
  return POST(request);
}
