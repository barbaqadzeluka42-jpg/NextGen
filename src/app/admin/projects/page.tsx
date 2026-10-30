import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ModerationButtons } from "@/components/admin/forms";
import { moderationLabels, projectCategoryLabels, projectDevLabels } from "@/lib/constants";
import { signedImageUrls } from "@/lib/project-images";
import { fmtDate } from "@/lib/utils";
import type { ProjectRow } from "@/lib/types";

export const metadata: Metadata = { title: "პროექტების მოდერაცია" };
export const dynamic = "force-dynamic";

const variant = { pending: "warning", approved: "success", rejected: "destructive" } as const;

export default async function AdminProjects() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(100);
  const all = (data ?? []) as ProjectRow[];
  const projects = [...all.filter((p) => p.moderation_status === "pending"), ...all.filter((p) => p.moderation_status !== "pending")];
  const images = await signedImageUrls(projects.map((p) => p.image_path));
  return (
    <>
      <PageHeader title="პროექტების მოდერაცია" description="საჯაროდ გამოჩნდება მხოლოდ ის პროექტი, რომელსაც ავტორების თანხმობა აქვს და შენ დაამტკიცებ." />
      {projects.length ? (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:p-5">
              {p.image_path && images[p.image_path] && (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL
                <img src={images[p.image_path]} alt="" className="h-40 w-full rounded-lg object-cover sm:h-28 sm:w-44" />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={variant[p.moderation_status]}>{moderationLabels[p.moderation_status]}</Badge>
                  <Badge variant="outline">{projectCategoryLabels[p.category]}</Badge>
                  <Badge variant="outline">{projectDevLabels[p.dev_status]}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</span>
                </div>
                <h2 className="text-lg font-bold">{p.title}</h2>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{p.description}</p>
                <p className="text-xs">ავტორები: {p.author_names.join(", ")} · თანხმობა: {p.authors_consent ? "✔ დადასტურებულია" : "✘ არ არის"}</p>
                <ModerationButtons id={p.id} status={p.moderation_status} />
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={<FolderKanban />} title="წარდგენილი პროექტები ჯერ არ არის" />}
    </>
  );
}
