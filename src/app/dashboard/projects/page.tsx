import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { moderationLabels, projectCategoryLabels } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";
import type { ProjectRow } from "@/lib/types";

export const metadata: Metadata = { title: "ჩემი პროექტები" };
export const dynamic = "force-dynamic";

const variant = { pending: "warning", approved: "success", rejected: "destructive" } as const;

export default async function MyProjectsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const viewer = await requireUser("/dashboard/projects");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("owner_id", viewer.id).order("created_at", { ascending: false });
  const projects = (data ?? []) as ProjectRow[];
  return (
    <>
      <PageHeader title="ჩემი პროექტები" description="წარადგინე პროექტი. გალერეაში ის ადმინისტრატორის დამტკიცების შემდეგ გამოჩნდება.">
        <Button asChild variant="gradient"><Link href="/dashboard/projects/new"><Plus /> ახალი პროექტი</Link></Button>
      </PageHeader>
      {sp.saved && <p role="status" className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3.5 py-3 text-sm text-success">პროექტი შენახულია და განხილვის რიგშია.</p>}
      {projects.length ? (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id} className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={variant[p.moderation_status]}>{moderationLabels[p.moderation_status]}</Badge>
                <Badge variant="outline">{projectCategoryLabels[p.category]}</Badge>
                <span className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</span>
              </div>
              <h2 className="mt-2 text-lg font-bold">{p.title}</h2>
              {p.moderation_status === "rejected" && p.rejection_reason && <p className="mt-1 text-sm text-destructive">მიზეზი: {p.rejection_reason}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><Link href={`/dashboard/projects/${p.id}`}>რედაქტირება</Link></Button>
                <DeleteProjectButton id={p.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<FolderKanban />} title="პროექტი ჯერ არ გაქვს წარდგენილი" description="გაგვიზიარე შენი იდეა ან ნამუშევარი." />
      )}
    </>
  );
}
