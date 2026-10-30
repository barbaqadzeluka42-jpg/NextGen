import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, CalendarX, CheckCircle2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { EVENT_COLUMNS, eventPhase, regVariant } from "@/lib/events";
import { registrationStatusLabels } from "@/lib/constants";
import { fmtDateTime } from "@/lib/utils";
import type { EventRow, NotificationRow, RegistrationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "ჩემი დაფა" };
export const dynamic = "force-dynamic";

interface RegWithEvent {
  id: string;
  status: RegistrationStatus;
  created_at: string;
  events: Pick<EventRow, "id" | "title" | "starts_at" | "location" | "status" | "category"> | null;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const viewer = await requireUser("/dashboard");
  const sp = await searchParams;
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [regsRes, upcomingRes, notifRes] = await Promise.all([
    supabase.from("event_registrations").select("id,status,created_at,events(id,title,starts_at,location,status,category)")
      .eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("events").select(EVENT_COLUMNS).eq("status", "published").gte("starts_at", nowIso).order("starts_at").limit(12),
    supabase.from("notifications").select("id,type,title,body,link,read_at,created_at").order("created_at", { ascending: false }).limit(4),
  ]);
  const regs = ((regsRes.data ?? []) as unknown as RegWithEvent[]).filter((r) => r.events);
  const myEventIds = new Set(regs.filter((r) => r.status === "pending" || r.status === "approved").map((r) => r.events!.id));
  const upcoming = ((upcomingRes.data ?? []) as EventRow[]).filter((e) => eventPhase(e) === "open" && !myEventIds.has(e.id)).slice(0, 4);
  const notifs = (notifRes.data ?? []) as NotificationRow[];
  const active = regs.filter((r) => r.status === "pending" || r.status === "approved").length;

  return (
    <div className="space-y-10">
      <PageHeader title={`გამარჯობა, ${viewer.fullName.split(" ")[0]} 👋`} description="აქ ნახავ შენს განაცხადებს, შეტყობინებებს და ახალ კონკურსებს." />
      {sp.password === "updated" && <p role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3.5 py-3 text-sm text-success"><CheckCircle2 className="size-4" /> პაროლი წარმატებით შეიცვალა.</p>}

      <section aria-labelledby="regs">
        <h2 id="regs" className="mb-4 flex items-center gap-2 text-lg font-bold"><CalendarCheck className="size-5 text-primary" /> ჩემი რეგისტრაციები <Badge variant="secondary">{active} აქტიური</Badge></h2>
        {regs.length ? (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {regs.map((r) => (
              <li key={r.id}>
                <Link href={`/events/${r.events!.id}`} className="flex min-h-[4.5rem] flex-col gap-2 px-4 py-3 hover:bg-secondary/60 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold sm:truncate">{r.events!.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">{fmtDateTime(r.events!.starts_at)} · {r.events!.location}</span>
                    {r.events!.status === "cancelled" && <span className="text-xs font-medium text-destructive">ღონისძიება გაუქმებულია</span>}
                  </span>
                  <Badge variant={regVariant[r.status]} className="self-start">{registrationStatusLabels[r.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CalendarX />} title="ჯერ არცერთ ღონისძიებაზე ხარ დარეგისტრირებული" description="აირჩიე ღონისძიება და გააგზავნე განაცხადი ერთი ღილაკით.">
            <Button asChild variant="gradient"><Link href="/events">ღონისძიებების ნახვა</Link></Button>
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="new">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new" className="flex items-center gap-2 text-lg font-bold"><Trophy className="size-5 text-primary" /> ახალი კონკურსები</h2>
          <Button asChild variant="ghost" size="sm"><Link href="/events">ყველა <ArrowRight /></Link></Button>
        </div>
        {upcoming.length ? (
          <div className="grid gap-4 xl:grid-cols-2">{upcoming.map((e) => <EventCard key={e.id} event={e} />)}</div>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">ამ ეტაპზე რეგისტრაციისთვის ღია ახალი ღონისძიება არ არის.</p>
        )}
      </section>

      <section aria-labelledby="notifs">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="notifs" className="flex items-center gap-2 text-lg font-bold"><Bell className="size-5 text-primary" /> ბოლო შეტყობინებები</h2>
          <Button asChild variant="ghost" size="sm"><Link href="/dashboard/notifications">ყველა <ArrowRight /></Link></Button>
        </div>
        {notifs.length ? (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {notifs.map((n) => (
              <li key={n.id} className="flex gap-3 px-4 py-3 sm:px-5">
                {!n.read_at && <span aria-label="წაუკითხავი" className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
                <div className="min-w-0"><p className="font-semibold">{n.title}</p>{n.body && <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p>}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">შეტყობინებები ჯერ არ გაქვს.</p>
        )}
      </section>
    </div>
  );
}
