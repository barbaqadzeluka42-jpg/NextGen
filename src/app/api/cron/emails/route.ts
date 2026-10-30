import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processEmailOutbox } from "@/lib/email/outbox";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // refuse to run unauthenticated
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Vercel Cron: retries failed/pending mail and prunes old rate-limit rows. */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await processEmailOutbox(40);
  if (hasServiceRole()) {
    await createAdminClient().from("rate_limits").delete().lt("window_start", new Date(Date.now() - 86_400_000).toISOString());
  }
  return NextResponse.json(result);
}
