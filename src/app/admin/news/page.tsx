import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { DeleteAnnouncementButton } from "@/components/admin/forms";
import { fmtDateTime } from "@/lib/utils";
import type { AnnouncementRow } from "@/lib/types";

export const metadata: Metadata = { title: "სიახლეების მართვა" };
export const dynamic = "force-dynamic";

export default async function AdminNews() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("id,title,body,is_important,is_published,published_at,created_at").order("created_at", { ascending: false }).limit(100);
  const items = (data ?? []) as AnnouncementRow[];
  return (
    <>
      <PageHeader title="სიახლეები" description="განცხადებები და სიახლეები.">
        <Button asChild variant="gradient"><Link href="/admin/news/new"><Plus /> ახალი</Link></Button>
      </PageHeader>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={n.is_published ? "success" : "secondary"}>{n.is_published ? "გამოქვეყნებულია" : "დრაფტი"}</Badge>
                {n.is_important && <Badge variant="warning">მნიშვნელოვანი</Badge>}
                <span className="text-xs text-muted-foreground">{fmtDateTime(n.published_at ?? n.created_at)}</span>
              </div>
              <h2 className="font-bold">{n.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
              <div className="mt-3 flex gap-2"><Button asChild variant="outline" size="sm"><Link href={`/admin/news/${n.id}`}>რედაქტირება</Link></Button><DeleteAnnouncementButton id={n.id} /></div>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="სიახლე ჯერ არ არის" />}
    </>
  );
}
