import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import {
  archiveAllPastAppointments,
  expirePendingAppointments,
  sendAppointmentReminders,
} from "@/lib/appointments";

/**
 * Zamanlayıcı: pg_cron + pg_net (bkz. supabase/pg_cron.sql) her 5 dakikada POST atar.
 * Authorization: Bearer $CRON_SECRET. Expire + 1 saat kala müşteri SMS'i + gün sonu arşivi.
 */
export async function POST(request: Request) {
  const denied = checkCronAuth(request);
  if (denied) return denied;

  // Sıralı çalışır: expire → hatırlatma → arşiv (birbirinin verisini okuyabilir)
  const expired = await expirePendingAppointments();
  const reminders = await sendAppointmentReminders();
  const archived = await archiveAllPastAppointments();
  return NextResponse.json({ ok: true, expired, reminders, archived });
}

// pg_net http_post kullanır; GET yalnızca elle test için (aynı yetkilendirme)
export async function GET(request: Request) {
  return POST(request);
}
