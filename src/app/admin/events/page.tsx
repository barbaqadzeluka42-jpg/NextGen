import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { eventCategoryLabels, eventStatusLabels } from "@/lib/constants";
import { EVENT_COLUMNS } from "@/lib/events";
import { fmtDateTime } from "@/lib/utils";
import type { EventRow } from "@/lib/types";

export const metadata: Metadata = { title: "ღონისძიებების მართვა" };
export const dynamic = "force-dynamic";

const statusVariant = { draft: "secondary", published: "success", cancelled: "destructive", completed: "outline" } as const;

export default async function AdminEvents() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("events").select(EVENT_COLUMNS).order("starts_at", { ascending: false }).limit(200);
  const events = (data ?? []) as EventRow[];
  return (
    <>
      <PageHeader title="ღონისძიებები" description="შექმენი, დაარედაქტირე და მართე განაცხადები.">
        <Button asChild variant="gradient"><Link href="/admin/events/new"><Plus /> ახალი ღონისძიება</Link></Button>
      </PageHeader>
      {events.length ? (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/admin/events/${e.id}`} className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap gap-1.5"><Badge variant={statusVariant[e.status]}>{eventStatusLabels[e.status]}</Badge><Badge variant="outline">{eventCategoryLabels[e.category]}</Badge></div>
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="text-sm text-muted-foreground">{fmtDateTime(e.starts_at)} · {e.location}</p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">{e.taken_seats} / {e.max_participants} <span className="text-muted-foreground">მონაწილე</span></p>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="ღონისძიება ჯერ არ შექმნილა" description="შექმენი პირველი ღონისძიება: ჭადრაკის ტურნირი, Brain Arena ან სხვა."><Button asChild variant="gradient"><Link href="/admin/events/new">ახალი ღონისძიება</Link></Button></EmptyState>}
    </>
  );
}
