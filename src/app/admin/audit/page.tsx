import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { fmtDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "აუდიტის ჟურნალი" };
export const dynamic = "force-dynamic";

const ACTIONS: Record<string, string> = {
  "events.insert": "ღონისძიება შეიქმნა", "events.update": "ღონისძიება შეიცვალა", "events.delete": "ღონისძიება წაიშალა",
  "announcements.insert": "სიახლე შეიქმნა", "announcements.update": "სიახლე შეიცვალა", "announcements.delete": "სიახლე წაიშალა",
  "user_roles.update": "როლი შეიცვალა", "projects.update": "პროექტი მოდერირდა/შეიცვალა", "projects.delete": "პროექტი წაიშალა",
  "event_registrations.update": "განაცხადის სტატუსი შეიცვალა", "notifications.broadcast": "შეტყობინება გაიგზავნა",
};

export default async function AuditPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,metadata,created_at").order("created_at", { ascending: false }).limit(150);
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id,full_name").in("id", actorIds) : { data: [] };
  const names = new Map((actors ?? []).map((a) => [a.id as string, a.full_name as string]));
  return (
    <>
      <PageHeader title="აუდიტის ჟურნალი" description="მნიშვნელოვანი ადმინისტრაციული მოქმედებები. ჩანაწერები იქმნება ბაზის დონეზე და ვერ იცვლება." />
      <Card><CardContent className="p-0">
        <ul className="divide-y">
          {rows.map((r) => {
            const m = r.metadata as { title?: string; status?: string; previous_status?: string; role?: string; previous_role?: string; changed?: string[]; recipients?: number };
            const detail = [m.title, m.previous_role && `${m.previous_role} → ${m.role}`, m.previous_status && m.status && `${m.previous_status} → ${m.status}`, m.changed?.length ? `ველები: ${m.changed.join(", ")}` : null, m.recipients != null ? `ადრესატი: ${m.recipients}` : null].filter(Boolean).join(" · ");
            return (
              <li key={r.id} className="p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span className="font-semibold">{ACTIONS[r.action] ?? r.action}</span>
                  <time dateTime={r.created_at} className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)}</time>
                </div>
                <p className="mt-0.5 text-muted-foreground">{names.get(r.actor_id ?? "") ?? "წაშლილი მომხმარებელი"}{detail ? ` — ${detail}` : ""}</p>
              </li>
            );
          })}
          {!rows.length && <li className="p-6 text-center text-sm text-muted-foreground">ჩანაწერები ჯერ არ არის.</li>}
        </ul>
      </CardContent></Card>
    </>
  );
}
