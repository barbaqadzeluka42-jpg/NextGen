import "server-only";
import { headers } from "next/headers";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/**
 * Fixed-window limiter stored in Postgres (works across serverless instances).
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!hasServiceRole()) {
    if (process.env.NODE_ENV === "production") return false; // fail closed
    return true;
  }
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: key.slice(0, 200),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit error", error.message);
    return process.env.NODE_ENV !== "production";
  }
  return data === true;
}

export const TOO_MANY = "ძალიან ბევრი მცდელობაა. გთხოვთ, სცადო ცოტა ხანში.";
