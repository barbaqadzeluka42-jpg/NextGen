"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation";
import { clientIp, rateLimit, TOO_MANY } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/env";
import { safeNext } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

export async function signUp(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "გადაამოწმე შევსებული ველები." };
  const { fullName, email, password } = parsed.data;

  const ip = await clientIp();
  if (!(await rateLimit(`signup:ip:${ip}`, 8, 3600)) || !(await rateLimit(`signup:email:${email}`, 3, 3600))) {
    return { message: TOO_MANY };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, terms_accepted: "true" }, // role is NEVER taken from here
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    if (error.code === "weak_password") return { errors: { password: ["პაროლი ძალიან სუსტია"] } };
    if (error.code === "over_email_send_rate_limit" || error.status === 429) return { message: TOO_MANY };
    console.error("signUp", error.code, error.message);
    return { message: "რეგისტრაცია ვერ მოხერხდა. სცადე თავიდან." };
  }
  if (data.session) redirect("/dashboard"); // e-mail confirmation disabled in Supabase
  // Same answer whether or not the address already exists (no account enumeration).
  return { ok: true, message: "გამოგიგზავნეთ დადასტურების წერილი. გახსენი ელფოსტა და დააჭირე ბმულს. თუ ვერ ნახე, შეამოწმე Spam საქაღალდეც." };
}

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { email, password } = parsed.data;
  const next = safeNext(String(formData.get("next") ?? ""));

  const ip = await clientIp();
  if (!(await rateLimit(`login:ip:${ip}`, 30, 600)) || !(await rateLimit(`login:email:${email}`, 8, 600))) {
    return { message: TOO_MANY };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { message: "ჯერ დაადასტურე ელფოსტა — გამოგვიგზავნია წერილი ბმულით." };
    return { message: "ელფოსტა ან პაროლი არასწორია." };
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { email } = parsed.data;

  const ip = await clientIp();
  if (!(await rateLimit(`reset:ip:${ip}`, 8, 3600)) || !(await rateLimit(`reset:email:${email}`, 3, 3600))) {
    return { message: TOO_MANY };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error) console.error("resetPasswordForEmail", error.code, error.message);
  // identical answer in every case → no account enumeration
  return { ok: true, message: "თუ ამ ელფოსტით ანგარიში არსებობს, პაროლის აღდგენის ბმული გამოგზავნილია." };
}

export async function updatePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { message: "ბმულს ვადა გაუვიდა. მოითხოვე პაროლის აღდგენა თავიდან." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { errors: { password: ["ახალი პაროლი განსხვავებული უნდა იყოს"] } };
    if (error.code === "weak_password") return { errors: { password: ["პაროლი ძალიან სუსტია"] } };
    return { message: "პაროლის შეცვლა ვერ მოხერხდა." };
  }
  redirect("/dashboard?password=updated");
}
