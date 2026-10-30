import "server-only";
import { after } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { renderEmail } from "./templates";
import { sendEmail } from "./send";

const MAX_ATTEMPTS = 5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OutboxRow {
  id: string;
  user_id: string;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
}

/**
 * Sends queued e-mails. Rows are queued by database triggers in the same transaction as the
 * change that caused them, so nothing is lost if this worker is not running at that moment.
 * Handles: daily cap (Resend free plan), 429 back-off, retries with exponential delay.
 */
export async function processEmailOutbox(limit = 10): Promise<{ sent: number; failed: number; skipped?: string }> {
  if (!hasServiceRole()) return { sent: 0, failed: 0, skipped: "service role not configured" };
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { sent: 0, failed: 0, skipped: "e-mail provider not configured" };

  const admin = createAdminClient();
  const cap = Number(process.env.EMAIL_DAILY_LIMIT ?? 90);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const { count: sentToday } = await admin
    .from("email_outbox").select("id", { count: "exact", head: true })
    .eq("status", "sent").gte("sent_at", dayStart.toISOString());
  const remaining = cap - (sentToday ?? 0);
  if (remaining <= 0) return { sent: 0, failed: 0, skipped: "daily limit reached" };

  const { data, error } = await admin.rpc("claim_email_outbox", { p_limit: Math.min(limit, remaining) });
  if (error) {
    console.error("claim_email_outbox", error.message);
    return { sent: 0, failed: 0, skipped: "claim failed" };
  }

  const rows = (data ?? []) as OutboxRow[];
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const release = (patch: Record<string, unknown>) => admin.from("email_outbox").update(patch).eq("id", row.id);

    const { data: rcpt } = await admin.rpc("get_user_email", { p_user_id: row.user_id });
    const recipient = (rcpt as { email: string | null; confirmed: boolean }[] | null)?.[0];
    const rendered = renderEmail(row.kind, row.payload);

    if (!recipient?.email || !recipient.confirmed || !rendered) {
      await release({ status: "failed", last_error: !rendered ? "unknown template" : "no confirmed recipient" });
      failed++;
      continue;
    }

    const result = await sendEmail({ to: recipient.email, ...rendered });
    if (result.ok) {
      await release({ status: "sent", sent_at: new Date().toISOString(), last_error: null });
      sent++;
    } else if (result.retryable && row.attempts < MAX_ATTEMPTS) {
      const delayMin = Math.min(5 * 2 ** (row.attempts - 1), 360);
      await release({
        status: "pending",
        last_error: result.error?.slice(0, 500),
        next_attempt_at: new Date(Date.now() + delayMin * 60_000).toISOString(),
      });
      if (result.rateLimited) {
        // put the rest of the claimed batch back untouched and stop
        const rest = rows.slice(i + 1).map((r) => r.id);
        if (rest.length) await admin.from("email_outbox").update({ status: "pending", attempts: 0 }).in("id", rest);
        break;
      }
    } else {
      await release({ status: "failed", last_error: result.error?.slice(0, 500) });
      failed++;
    }
    await sleep(600); // stay under Resend's 2 requests/second
  }
  return { sent, failed };
}

/** Call at the end of a server action: sends freshly queued mail after the response is returned. */
export function scheduleEmailFlush() {
  after(async () => {
    try {
      await processEmailOutbox(10);
    } catch (e) {
      console.error("email flush failed", e);
    }
  });
}
