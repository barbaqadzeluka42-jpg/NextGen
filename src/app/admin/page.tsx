import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, FolderKanban, GraduationCap, Hourglass, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { eventCategoryLabels } from "@/lib/constants";
import type { EventRow } from "@/lib/types";

export const metadata: Metadata = { title: "ადმინისტრირება" };
export const dynamic = "force-dynamic";

function Stat({ icon: Icon, label, value, href }: { icon: typeof Users; label: string; value: number; href?: string }) {
  const inner = (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"><Icon className="size-5" /></div>
      <div><p className="text-2xl font-extrabold leading-none">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>
    </div>
  );
  return href ? <Link href={href} className="block transition-transform hover:-translate-y-0.5">{inner}</Link> : inner;
}

export default async function AdminHome() {
  await requireAdmin();
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [users, events, pending, approved, projectsPending, eventList] = await Promise.all([
    supabase.from("profiles").select("id", head),
    supabase.from("events").select("id", head).eq("status", "published"),
    supabase.from("event_registrations").select("id", head).eq("status", "pending"),
    supabase.from("event_registrations").select("id", head).eq("status", "approved"),
    supabase.from("projects").select("id", head).eq("moderation_status", "pending"),
    supabase.from("events").select("id,title,category,starts_at,max_participants,taken_seats,status").neq("status", "draft").order("starts_at", { ascending: false }).limit(10),
  ]);
  const list = (eventList.data ?? []) as Pick<EventRow, "id" | "title" | "category" | "starts_at" | "max_participants" | "taken_seats" | "status">[];

  return (
    <>
      <PageHeader title="მიმოხილვა" description="პლატფორმის სტატისტიკა და ის, რაც ყურადღებას საჭიროებს.">
        <Button asChild variant="gradient"><Link href="/admin/events/new">ახალი ღონისძიება</Link></Button>
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={GraduationCap} label="რეგისტრირებული მომხმარებელი" value={users.count ?? 0} />
        <Stat icon={CalendarDays} label="გამოქვეყნებული ღონისძიება" value={events.count ?? 0} href="/admin/events" />
        <Stat icon={Hourglass} label="განსახილველი განაცხადი" value={pending.count ?? 0} href="/admin/events" />
        <Stat icon={ClipboardCheck} label="დადასტურებული მონაწილე" value={approved.count ?? 0} />
        <Stat icon={FolderKanban} label="მოდერაციის მომლოდინე პროექტი" value={projectsPending.count ?? 0} href="/admin/projects" />
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle>ღონისძიებების შევსებადობა</CardTitle></CardHeader>
        <CardContent>
          {list.length ? (
            <ul className="space-y-4">
              {list.map((e) => {
                const pct = Math.min(100, Math.round((e.taken_seats / e.max_participants) * 100));
                return (
                  <li key={e.id}>
                    <Link href={`/admin/events/${e.id}`} className="group block">
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium group-hover:text-primary">{e.title} <span className="text-muted-foreground">· {eventCategoryLabels[e.category]}</span></span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{e.taken_seats}/{e.max_participants}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${pct}% შევსებული`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted-foreground">გამოქვეყნებული ღონისძიება ჯერ არ არის.</p>}
        </CardContent>
      </Card>
    </>
  );
}
