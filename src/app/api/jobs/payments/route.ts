import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { runPaymentJobs } from "@/lib/subscription-jobs";

/** Ödeme penceresi bildirimleri — pg_cron + pg_net ile günde bir (bkz. supabase/pg_cron.sql). */
export async function POST(request: Request) {
  const denied = checkCronAuth(request);
  if (denied) return denied;
  const result = await runPaymentJobs();
  return NextResponse.json({ ok: true, ...result });
}
