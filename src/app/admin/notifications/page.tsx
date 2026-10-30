import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { NotificationForm } from "@/components/admin/forms";
import { fmtDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "შეტყობინებების მართვა" };
export const dynamic = "force-dynamic";

export default async function AdminNotifications() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: events }, { data: sent }] = await Promise.all([
    supabase.from("events").select("id,title").in("status", ["published", "completed"]).order("starts_at", { ascending: false }).limit(50),
    supabase.from("audit_logs").select("id,created_at,metadata").eq("action", "notifications.broadcast").order("created_at", { ascending: false }).limit(10),
  ]);
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="შეტყობინებები" description="გაგზავნე საიტზე შიდა შეტყობინება ყველა მომხმარებელს ან კონკრეტული ღონისძიების მონაწილეებს." />
      <Card><CardContent className="pt-6"><NotificationForm events={(events ?? []) as { id: string; title: string }[]} /></CardContent></Card>
      <Card>
        <CardHeader><CardTitle>ბოლო გაგზავნილი</CardTitle><CardDescription>ჩანაწერები აუდიტის ჟურნალიდან.</CardDescription></CardHeader>
        <CardContent>
          {sent?.length ? (
            <ul className="divide-y text-sm">
              {sent.map((s) => {
                const m = s.metadata as { title?: string; recipients?: number };
                return <li key={s.id} className="flex justify-between gap-3 py-2.5"><span className="min-w-0 truncate">{m.title}</span><span className="shrink-0 text-muted-foreground">{m.recipients} · {fmtDateTime(s.created_at)}</span></li>;
              })}
            </ul>
          ) : <p className="text-sm text-muted-foreground">ჯერ არაფერი გაგზავნილა.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
