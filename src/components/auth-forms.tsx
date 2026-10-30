"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Input, Checkbox } from "@/components/ui/input";
import { CheckRow, Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/actions/auth";
import type { ActionState } from "@/lib/types";

const empty: ActionState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, empty);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormAlert state={state} />
      <Field label="ელფოსტა" name="email" errors={state?.errors?.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required aria-invalid={!!state?.errors?.email} aria-describedby="email-error" />
      </Field>
      <Field label="პაროლი" name="password" errors={state?.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!state?.errors?.password} />
      </Field>
      <div className="text-right text-sm"><Link href="/forgot-password" className="inline-flex min-h-10 items-center text-primary hover:underline">დაგავიწყდა პაროლი?</Link></div>
      <SubmitButton size="lg" variant="gradient" className="w-full" pendingText="შესვლა...">შესვლა</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(signUp, empty);
  if (state?.ok) return <FormAlert state={state} />;
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="სახელი და გვარი" name="fullName" errors={e.fullName} hint="საჯაროდ არ გამოჩნდება.">
        <Input id="fullName" name="fullName" autoComplete="name" required maxLength={80} aria-invalid={!!e.fullName} aria-describedby="fullName-error fullName-hint" />
      </Field>
      <Field label="ელფოსტა" name="email" errors={e.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required aria-invalid={!!e.email} aria-describedby="email-error" />
      </Field>
      <Field label="პაროლი" name="password" errors={e.password} hint="მინიმუმ 8 სიმბოლო, ასოც და ციფრიც.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!e.password} aria-describedby="password-error password-hint" />
      </Field>
      <CheckRow htmlFor="ageConsent" error={e.ageConsent?.[0]}>
        <Checkbox id="ageConsent" name="ageConsent" aria-describedby="ageConsent-error" />
        <label htmlFor="ageConsent">ვადასტურებ, რომ ვარ მინიმუმ 16 წლის, ან მაქვს მშობლის/კანონიერი წარმომადგენლის თანხმობა.</label>
      </CheckRow>
      <CheckRow htmlFor="terms" error={e.terms?.[0]}>
        <Checkbox id="terms" name="terms" aria-describedby="terms-error" />
        <label htmlFor="terms">ვეთანხმები <Link href="/terms" className="text-primary underline" target="_blank">გამოყენების წესებს</Link> და <Link href="/privacy" className="text-primary underline" target="_blank">კონფიდენციალურობის პოლიტიკას</Link>.</label>
      </CheckRow>
      <SubmitButton size="lg" variant="gradient" className="w-full" pendingText="იგზავნება...">რეგისტრაცია</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, empty);
  if (state?.ok) return <FormAlert state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="ელფოსტა" name="email" errors={state?.errors?.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required aria-describedby="email-error" />
      </Field>
      <SubmitButton size="lg" variant="gradient" className="w-full" pendingText="იგზავნება...">აღდგენის ბმულის გაგზავნა</SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(updatePassword, empty);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="ახალი პაროლი" name="password" errors={state?.errors?.password} hint="მინიმუმ 8 სიმბოლო, ასოც და ციფრიც.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="password-error password-hint" />
      </Field>
      <SubmitButton size="lg" variant="gradient" className="w-full" pendingText="ინახება...">პაროლის შეცვლა</SubmitButton>
    </form>
  );
}
