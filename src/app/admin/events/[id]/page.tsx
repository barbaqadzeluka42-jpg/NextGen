import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EventForm } from "@/components/admin/event-form";
import { DecisionButtons, EventDangerZone } from "@/components/admin/event-actions";
import { EVENT_COLUMNS, regVariant } from "@/lib/events";
import { registrationStatusLabels } from "@/lib/constants";
import { fmtDateTime } from "@/lib/utils";
import { uuid } from "@/lib/validation";
import type { EventRow, RegistrationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "ღონისძიების მართვა" };
export const dynamic = "force-dynamic";

interface Reg { id: string; status: RegistrationStatus; created_at: string; profiles: { full_name: string; grade: number | null } | null }

export default async function AdminEventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  await requireAdmin();
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const [{ data: ev }, { data: regData }] = await Promise.all([
    supabase.from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("event_registrations").select("id,status,created_at,profiles(full_name,grade)").eq("event_id", id).order("created_at"),
  ]);
  if (!ev) notFound();
  const event = ev as EventRow;
  const regs = (regData ?? []) as unknown as Reg[];
  const counts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 } as Record<RegistrationStatus, number>;
  regs.forEach((r) => counts[r.status]++);
  const created = (await searchParams).created;

  return (
    <div className="space-y-8">
      <PageHeader title={event.title} description={`${fmtDateTime(event.starts_at)} · ${event.location}`}>
        {event.status !== "draft" && <Button asChild variant="outline"><Link href={`/events/${event.id}`}><ExternalLink /> საჯარო გვერდი</Link></Button>}
      </PageHeader>
      {created && <p role="status" className="rounded-lg border border-success/30 bg-success/10 px-3.5 py-3 text-sm text-success">ღონისძიება შეიქმნა.</p>}

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>მონაწილეები ({event.taken_seats}/{event.max_participants})</CardTitle>
          {regs.length > 0 && <Button asChild variant="outline" size="sm"><a href={`/admin/events/${event.id}/export`}><Download /> CSV</a></Button>}
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(counts) as RegistrationStatus[]).map((s) => <Badge key={s} variant={regVariant[s]}>{registrationStatusLabels[s]}: {counts[s]}</Badge>)}
          </div>
          {regs.length ? (
            <ul className="divide-y rounded-xl border">
              {regs.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.profiles?.full_name ?? "—"}{r.profiles?.grade ? <span className="font-normal text-muted-foreground"> · {r.profiles.grade} კლასი</span> : null}</p>
                    <p className="text-xs text-muted-foreground">გაგზავნილია: {fmtDateTime(r.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <Badge variant={regVariant[r.status]}>{registrationStatusLabels[r.status]}</Badge>
                    {r.status !== "cancelled" && <DecisionButtons registrationId={r.id} status={r.status} />}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">განაცხადები ჯერ არ არის.</p>}
          <p className="mt-3 text-xs text-muted-foreground">კონფიდენციალურობისთვის ჩანს მხოლოდ სახელი და კლასი.</p>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>რედაქტირება</CardTitle></CardHeader><CardContent><EventForm event={event} /></CardContent></Card>
      <Card className="border-destructive/30"><CardHeader><CardTitle>საფრთხის ზონა</CardTitle></CardHeader><CardContent><EventDangerZone id={event.id} status={event.status} /></CardContent></Card>
    </div>
  );
}
