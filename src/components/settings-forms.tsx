"use client";
import { useActionState } from "react";
import { Checkbox, Input } from "@/components/ui/input";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { deleteAccount, updatePreferences, updateProfile } from "@/actions/account";
import type { ActionState, PreferencesRow } from "@/lib/types";

const empty: ActionState = {};

export function ProfileForm({ fullName, grade, email }: { fullName: string; grade: number | null; email: string }) {
  const [state, action] = useActionState(updateProfile, empty);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="ელფოსტა" name="email-ro" hint="ელფოსტის შეცვლა ამ ეტაპზე მხარდაჭერილი არ არის.">
        <Input id="email-ro" value={email} readOnly disabled />
      </Field>
      <Field label="სახელი და გვარი" name="fullName" errors={state?.errors?.fullName}>
        <Input id="fullName" name="fullName" defaultValue={fullName} required maxLength={80} autoComplete="name" aria-describedby="fullName-error" />
      </Field>
      <Field label="კლასი (არასავალდებულო)" name="grade" errors={state?.errors?.grade} hint="გვჭირდება მხოლოდ ღონისძიებების ორგანიზებისთვის.">
        <Input id="grade" name="grade" type="number" inputMode="numeric" min={1} max={12} defaultValue={grade ?? ""} className="sm:max-w-32" aria-describedby="grade-error grade-hint" />
      </Field>
      <SubmitButton pendingText="ინახება...">შენახვა</SubmitButton>
    </form>
  );
}

const PREFS: { name: keyof PreferencesRow; title: string; text: string }[] = [
  { name: "inapp_new_events", title: "ახალი ღონისძიებები (საიტზე)", text: "შეტყობინება, როცა ახალი კონკურსი ქვეყნდება." },
  { name: "inapp_announcements", title: "განცხადებები (საიტზე)", text: "მნიშვნელოვანი სიახლეები და განცხადებები." },
  { name: "email_event_changes", title: "ღონისძიების ცვლილებები (ელფოსტით)", text: "როცა შენი ღონისძიების დრო ან ადგილი იცვლება." },
  { name: "email_announcements", title: "მნიშვნელოვანი განცხადებები (ელფოსტით)", text: "მხოლოდ ადმინისტრატორის მიერ მნიშვნელოვნად მონიშნული განცხადებები." },
];

export function PreferencesForm({ prefs }: { prefs: PreferencesRow }) {
  const [state, action] = useActionState(updatePreferences, empty);
  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <ul className="divide-y rounded-xl border">
        {PREFS.map((p) => (
          <li key={p.name}>
            <label className="flex min-h-16 cursor-pointer items-start gap-3 px-4 py-3">
              <Checkbox name={p.name} defaultChecked={prefs[p.name]} />
              <span><span className="block font-medium">{p.title}</span><span className="block text-sm text-muted-foreground">{p.text}</span></span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">სავალდებულო შეტყობინებები (ელფოსტის დადასტურება, განაცხადის სტატუსი, ღონისძიების გაუქმება) ყოველთვის გამოგეგზავნება.</p>
      <SubmitButton pendingText="ინახება...">შენახვა</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, empty);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="დასადასტურებლად ჩაწერე: წაშლა" name="confirm" errors={state?.errors?.confirm}>
        <Input id="confirm" name="confirm" autoComplete="off" aria-describedby="confirm-error" />
      </Field>
      <SubmitButton variant="destructive" pendingText="იშლება...">ანგარიშის სამუდამო წაშლა</SubmitButton>
    </form>
  );
}
