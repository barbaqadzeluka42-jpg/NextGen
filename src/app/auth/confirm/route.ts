import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

const OTP_TYPES: EmailOtpType[] = ["signup", "recovery", "email", "invite", "magiclink", "email_change"];

/**
 * Landing point for links in Supabase Auth e-mails (confirm e-mail, reset password).
 * Supports both the token_hash flow (works across devices — recommended template) and the PKCE ?code= flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  const target = new URL(ok ? next : "/login?error=confirm", origin);
  if (ok && type === "recovery") target.pathname = "/reset-password";
  if (ok && (type === "signup" || type === "email")) target.searchParams.set("confirmed", "1");
  return NextResponse.redirect(target);
}
