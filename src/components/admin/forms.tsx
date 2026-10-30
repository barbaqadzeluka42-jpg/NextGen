"use client";
import { useActionState, useState, useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { deleteAnnouncement, deleteProjectAsAdmin, moderateProject, saveAnnouncement, sendNotification, setUserRole } from "@/actions/admin";
import { roleLabels } from "@/lib/constants";
import type { ActionState, AnnouncementRow, Role } from "@/lib/types";

export function AnnouncementForm({ item }: { item?: AnnouncementRow }) {
  const [state, action] = useActionState(saveAnnouncement, {} as ActionState);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {item && <input type="hidden" name="id" value={item.id} />}
      <FormAlert state={state} />
      <Field label="სათაური" name="title" errors={e.title}><Input id="title" name="title" required maxLength={140} defaultValue={item?.title} aria-describedby="title-error" /></Field>
      <Field label="ტექსტი" name="body" errors={e.body}><Textarea id="body" name="body" required rows={7} maxLength={5000} defaultValue={item?.body} aria-describedby="body-error" /></Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm">
        <Checkbox name="is_important" defaultChecked={item?.is_important} />
        <span><span className="block font-medium">მნიშვნელოვანი განცხადება</span><span className="text-muted-foreground">გამოქვეყნებისას დამატებით ელფოსტითაც გაიგზავნება (მათთვის, ვისაც ეს არ გამოუთიშავს). ელფოსტა მხოლოდ პირველი გამოქვეყნებისას იგზავნება.</span></span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm">
        <Checkbox name="is_published" defaultChecked={item?.is_published} />
        <span><span className="block font-medium">გამოქვეყნება</span><span className="text-muted-foreground">გამოქვეყნებისას მომხმარებლები საიტზე შეტყობინებას მიიღებენ. გამოუქვეყნებელი რჩება დრაფტად.</span></span>
      </label>
      <SubmitButton size="lg" variant="gradient" pendingText="ინახება...">შენახვა</SubmitButton>
    </form>
  );
}

export function DeleteAnnouncementButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <Button variant="outline" size="sm" disabled={pending} onClick={() => { if (confirm("წაიშალოს განცხადება?")) start(() => deleteAnnouncement(id)); }}><Trash2 /> წაშლა</Button>;
}

export function ModerationButtons({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>();
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && <Button size="sm" disabled={pending} onClick={() => start(async () => setMsg(await moderateProject(id, "approved")))}><Check /> გამოქვეყნება</Button>}
        {status !== "rejected" && !rejecting && <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}><X /> უარყოფა</Button>}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => { if (confirm("წაიშალოს პროექტი სამუდამოდ?")) start(() => deleteProjectAsAdmin(id)); }}><Trash2 /> წაშლა</Button>
      </div>
      {rejecting && (
        <div className="space-y-2 rounded-lg border p-3">
          <label htmlFor={`reason-${id}`} className="text-sm font-medium">უარყოფის მიზეზი (ავტორი დაინახავს)</label>
          <Textarea id={`reason-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} className="min-h-20" />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => { setMsg(await moderateProject(id, "rejected", reason)); setRejecting(false); })}>უარყოფის დადასტურება</Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>გაუქმება</Button>
          </div>
        </div>
      )}
      <FormAlert state={msg ?? {}} />
    </div>
  );
}

export function NotificationForm({ events }: { events: { id: string; title: string }[] }) {
  const [state, action] = useActionState(sendNotification, {} as ActionState);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="ადრესატები" name="event_id" errors={e.event_id}>
        <Select id="event_id" name="event_id" defaultValue="">
          <option value="">ყველა მომხმარებელი</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>მონაწილეები: {ev.title}</option>)}
        </Select>
      </Field>
      <Field label="სათაური" name="title" errors={e.title}><Input id="title" name="title" required maxLength={160} aria-describedby="title-error" /></Field>
      <Field label="ტექსტი (არასავალდებულო)" name="body" errors={e.body}><Textarea id="body" name="body" rows={4} maxLength={1000} aria-describedby="body-error" /></Field>
      <Field label="ბმული (არასავალდებულო)" name="link" errors={e.link} hint="საიტის შიდა მისამართი, მაგ. /events"><Input id="link" name="link" placeholder="/events" maxLength={200} aria-describedby="link-error link-hint" /></Field>
      <SubmitButton variant="gradient" pendingText="იგზავნება...">გაგზავნა</SubmitButton>
    </form>
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: Role; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>();
  return (
    <div className="flex flex-col items-end gap-1">
      <Select aria-label="როლი" className="min-w-44" defaultValue={role} disabled={disabled || pending}
        onChange={(ev) => { const next = ev.target.value as Role; if (confirm(`როლი შეიცვალოს: ${roleLabels[next]}?`)) start(async () => setMsg(await setUserRole(userId, next))); else ev.target.value = role; }}>
        {(Object.keys(roleLabels) as Role[]).map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
      </Select>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-xs text-success" : "text-xs text-destructive"}>{msg.message}</p>}
    </div>
  );
}
