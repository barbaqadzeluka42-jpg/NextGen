import "server-only";
import { createClient } from "@supabase/supabase-js";
import { secretKey } from "@/lib/env";

/**
 * Service-role client: BYPASSES RLS. Server only; used exclusively for
 *  - rate limiting, the e-mail outbox worker, resolving e-mail addresses,
 *  - deleting an account at the user's own request.
 * Never import this from client components (the `server-only` import enforces it).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = secretKey();
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is not configured (server-side only).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const hasServiceRole = () => Boolean(secretKey() && process.env.NEXT_PUBLIC_SUPABASE_URL);
