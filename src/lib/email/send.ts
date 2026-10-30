import "server-only";

export interface SendResult {
  ok: boolean;
  /** true when retrying later may succeed (rate limit, 5xx, network) */
  retryable: boolean;
  rateLimited?: boolean;
  error?: string;
}

/** Sends one e-mail through Resend's REST API. The API key never leaves the server. */
export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, retryable: false, error: "RESEND_API_KEY / EMAIL_FROM not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true, retryable: false };
    const body = await res.text().catch(() => "");
    const error = `Resend ${res.status}: ${body.slice(0, 300)}`;
    if (res.status === 429) return { ok: false, retryable: true, rateLimited: true, error };
    return { ok: false, retryable: res.status >= 500, error };
  } catch (e) {
    return { ok: false, retryable: true, error: e instanceof Error ? e.message : "network error" };
  }
}
