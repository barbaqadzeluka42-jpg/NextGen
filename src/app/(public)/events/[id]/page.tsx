import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarClock, ChevronLeft, Clock, MapPin, ScrollText, UserRound, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { RegisterButton } from "@/components/events/register-button";
import { EVENT_COLUMNS, eventPhase, phaseMeta } from "@/lib/events";
import { eventCategoryLabels } from "@/lib/constants";
import { fmtDateTime } from "@/lib/utils";
import { uuid } from "@/lib/validation";
import type { EventRow, RegistrationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(id: string) {
  if (!uuid.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle();
  return (data as EventRow | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const e = await load((await params).id);
  return { title: e?.title ?? "ღონისძიება", description: e?.description.slice(0, 160) };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await load(id);
  if (!event) notFound();

  const viewer = await getViewer();
  let myStatus: RegistrationStatus | null = null;
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.from("event_registrations").select("status").eq("event_id", id).eq("user_id", viewer.id).maybeSingle();
    myStatus = (data?.status as RegistrationStatus | undefined) ?? null;
  }
  const phase = eventPhase(event);
  const meta = phaseMeta[phase];
  const seatsLeft = Math.max(0, event.max_participants - event.taken_seats);
  const pct = Math.min(100, Math.round((event.taken_seats / event.max_participants) * 100));
  const canCancel = new Date() < new Date(event.starts_at) && event.status === "published";

  const facts = [
    { icon: CalendarClock, label: "დაწყება", value: fmtDateTime(event.starts_at) },
    ...(event.ends_at ? [{ icon: Clock, label: "დასრულება", value: fmtDateTime(event.ends_at) }] : []),
    { icon: MapPin, label: "ადგილი", value: event.location },
    { icon: Clock, label: "რეგისტრაციის ბოლო ვადა", value: fmtDateTime(event.registration_deadline) },
    { icon: UserRound, label: "ორგანიზატორი", value: event.organizer },
  ];

  return (
    <div className="container-page py-6 sm:py-10">
      <Link href="/events" className="mb-5 inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> ყველა ღონისძიება</Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <article className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="outline">{eventCategoryLabels[event.category]}</Badge>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {event.status === "draft" && <Badge variant="warning">დრაფტი — მხოლოდ ადმინებისთვის</Badge>}
          </div>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">{event.title}</h1>
          <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-muted-foreground sm:text-lg">{event.description}</p>

          {event.rules && (
            <section className="mt-8 rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="rules">
              <h2 id="rules" className="mb-3 flex items-center gap-2 text-lg font-bold"><ScrollText className="size-5 text-primary" /> მონაწილეობის წესები</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed sm:text-base">{event.rules}</p>
            </section>
          )}
        </article>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <dl className="space-y-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>
                </div>
              ))}
              <div className="flex gap-3">
                <Users className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-muted-foreground">მონაწილეები</dt>
                  <dd className="font-medium">{event.taken_seats} / {event.max_participants} <span className="text-sm font-normal text-muted-foreground">(დარჩენილია {seatsLeft})</span></dd>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`შევსებულია ${pct}%`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </dl>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <RegisterButton eventId={event.id} phase={phase} myStatus={myStatus} signedIn={Boolean(viewer)} canCancel={canCancel} />
            {!viewer && phase !== "open" && <p className="text-sm text-muted-foreground">{meta.label}.</p>}
            {viewer && !myStatus && phase !== "open" && <p className="text-sm text-muted-foreground">{meta.label}.</p>}
            {event.auto_approve && phase === "open" && !myStatus && <p className="mt-2 text-xs text-muted-foreground">განაცხადი ავტომატურად დადასტურდება.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
