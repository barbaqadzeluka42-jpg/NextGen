import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/events/event-card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { EVENT_COLUMNS } from "@/lib/events";
import { eventCategoryLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EventCategory, EventRow } from "@/lib/types";

export const metadata: Metadata = { title: "ღონისძიებები" };
export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ category?: string; past?: string }> }) {
  const sp = await searchParams;
  const category = sp.category && sp.category in eventCategoryLabels ? (sp.category as EventCategory) : null;
  const past = sp.past === "1";

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let q = supabase.from("events").select(EVENT_COLUMNS).neq("status", "draft");
  q = past ? q.lt("starts_at", nowIso).order("starts_at", { ascending: false }) : q.gte("starts_at", nowIso).order("starts_at");
  if (category) q = q.eq("category", category);
  const { data } = await q.limit(60);
  const events = (data ?? []) as EventRow[];

  const href = (c: string | null, p: boolean) => {
    const params = new URLSearchParams();
    if (c) params.set("category", c);
    if (p) params.set("past", "1");
    const s = params.toString();
    return s ? `/events?${s}` : "/events";
  };
  const chip = (active: boolean) =>
    cn("inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary");

  return (
    <div className="container-page py-8 sm:py-12">
      <PageHeader title="ღონისძიებები" description="კონკურსები, ტურნირები და სხვა აქტივობები. აირჩიე და დარეგისტრირდი." />
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0" role="navigation" aria-label="კატეგორიები">
        <Link href={href(null, past)} className={chip(!category)} aria-current={!category ? "page" : undefined}>ყველა</Link>
        {Object.entries(eventCategoryLabels).map(([k, label]) => (
          <Link key={k} href={href(k, past)} className={chip(category === k)} aria-current={category === k ? "page" : undefined}>{label}</Link>
        ))}
        <span className="mx-1 hidden w-px bg-border sm:block" />
        <Link href={href(category, !past)} className={chip(past)}>{past ? "← მომავალი" : "გასული ღონისძიებები"}</Link>
      </div>
      {events.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
      ) : (
        <EmptyState icon={<CalendarX />} title={past ? "გასული ღონისძიებები არ მოიძებნა" : "ღონისძიებები ვერ მოიძებნა"} description="სცადე სხვა კატეგორია ან დაბრუნდი მოგვიანებით." />
      )}
    </div>
  );
}
