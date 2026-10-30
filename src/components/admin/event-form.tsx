"use client";
import { useActionState } from "react";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { saveEvent } from "@/actions/admin";
import { eventCategoryLabels, eventStatusLabels } from "@/lib/constants";
import { toInputValue } from "@/lib/utils";
import type { ActionState, EventRow } from "@/lib/types";

export function EventForm({ event }: { event?: EventRow }) {
  const [state, action] = useActionState(saveEvent, {} as ActionState);
  const e = state?.errors ?? {};
  const err = (n: string) => ({ "aria-invalid": !!e[n], "aria-describedby": `${n}-error` });
  return (
    <form action={action} className="space-y-5" noValidate>
      {event && <input type="hidden" name="id" value={event.id} />}
      <FormAlert state={state} />
      <Field label="სათაური" name="title" errors={e.title}><Input id="title" name="title" required maxLength={140} defaultValue={event?.title} {...err("title")} /></Field>
      <Field label="აღწერა" name="description" errors={e.description}><Textarea id="description" name="description" required rows={6} maxLength={5000} defaultValue={event?.description} {...err("description")} /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="კატეგორია" name="category" errors={e.category}>
          <Select id="category" name="category" defaultValue={event?.category ?? "other"}>{Object.entries(eventCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        <Field label="სტატუსი" name="status" errors={e.status} hint="„გამოქვეყნებული“ ღონისძიება ყველას უჩანს და მომხმარებლებს შეტყობინება მიეცემათ.">
          <Select id="status" name="status" defaultValue={event?.status ?? "draft"}>{Object.entries(eventStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        <Field label="დაწყების თარიღი და დრო" name="starts_at" errors={e.starts_at} hint="თბილისის დროით">
          <Input id="starts_at" name="starts_at" type="datetime-local" required defaultValue={toInputValue(event?.starts_at)} {...err("starts_at")} />
        </Field>
        <Field label="დასრულების დრო (არასავალდებულო)" name="ends_at" errors={e.ends_at}>
          <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toInputValue(event?.ends_at)} {...err("ends_at")} />
        </Field>
        <Field label="რეგისტრაციის ბოლო ვადა" name="registration_deadline" errors={e.registration_deadline}>
          <Input id="registration_deadline" name="registration_deadline" type="datetime-local" required defaultValue={toInputValue(event?.registration_deadline)} {...err("registration_deadline")} />
        </Field>
        <Field label="მონაწილეთა მაქსიმალური რაოდენობა" name="max_participants" errors={e.max_participants}>
          <Input id="max_participants" name="max_participants" type="number" inputMode="numeric" min={1} max={10000} required defaultValue={event?.max_participants ?? 20} {...err("max_participants")} />
        </Field>
        <Field label="ჩატარების ადგილი" name="location" errors={e.location}><Input id="location" name="location" required maxLength={200} defaultValue={event?.location} {...err("location")} /></Field>
        <Field label="ორგანიზატორი" name="organizer" errors={e.organizer}><Input id="organizer" name="organizer" required maxLength={120} defaultValue={event?.organizer} {...err("organizer")} /></Field>
      </div>
      <Field label="მონაწილეობის წესები" name="rules" errors={e.rules}><Textarea id="rules" name="rules" rows={5} maxLength={4000} defaultValue={event?.rules ?? ""} {...err("rules")} /></Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm">
        <Checkbox name="auto_approve" defaultChecked={event?.auto_approve} />
        <span><span className="block font-medium">განაცხადების ავტომატური დადასტურება</span><span className="text-muted-foreground">თუ გამორთულია, თითოეული განაცხადი ხელით უნდა დაამტკიცო ან უარყო.</span></span>
      </label>
      <SubmitButton size="lg" variant="gradient" pendingText="ინახება...">{event ? "ცვლილებების შენახვა" : "ღონისძიების შექმნა"}</SubmitButton>
    </form>
  );
}
