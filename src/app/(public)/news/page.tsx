import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/page-header";
import { fmtDate } from "@/lib/utils";
import type { AnnouncementRow } from "@/lib/types";

export const metadata: Metadata = { title: "სიახლეები" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("id,title,body,is_important,is_published,published_at,created_at")
    .eq("is_published", true).order("published_at", { ascending: false }).limit(50);
  const items = (data ?? []) as AnnouncementRow[];
  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <PageHeader title="სიახლეები" description="განცხადებები და მნიშვნელოვანი ინფორმაცია პლატფორმიდან." />
      {items.length ? (
        <div className="space-y-4">
          {items.map((n) => (
            <article key={n.id} className="rounded-xl border bg-card p-5 sm:p-6">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {n.published_at && <time dateTime={n.published_at}>{fmtDate(n.published_at)}</time>}
                {n.is_important && <Badge variant="warning">მნიშვნელოვანი</Badge>}
              </div>
              <h2 className="text-lg font-bold leading-snug sm:text-xl">{n.title}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">{n.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Megaphone />} title="სიახლეები ჯერ არ გამოქვეყნებულა" />
      )}
    </div>
  );
}
