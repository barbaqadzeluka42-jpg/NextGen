import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { signedImageUrls } from "@/lib/project-images";
import type { ProjectRow } from "@/lib/types";

export const metadata: Metadata = { title: "პროექტების გალერეა" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const viewer = await getViewer();
  const { data } = await supabase.from("projects").select("*").eq("moderation_status", "approved").order("created_at", { ascending: false }).limit(60);
  const projects = (data ?? []) as ProjectRow[];
  const images = await signedImageUrls(projects.map((p) => p.image_path));
  return (
    <div className="container-page py-8 sm:py-12">
      <PageHeader title="პროექტების გალერეა" description="მოსწავლეთა ნამუშევრები. ყველა პროექტი ავტორების თანხმობითა და ადმინისტრატორის დამტკიცების შემდეგ ქვეყნდება.">
        <Button asChild variant="gradient"><Link href={viewer ? "/dashboard/projects/new" : "/register"}>პროექტის წარდგენა</Link></Button>
      </PageHeader>
      {projects.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => <ProjectCard key={p.id} project={p} imageUrl={p.image_path ? images[p.image_path] : null} />)}
        </div>
      ) : (
        <EmptyState icon={<FolderKanban />} title="დამტკიცებული პროექტები ჯერ არ არის" description="იყავი პირველი, ვინც თავის პროექტს წარადგენს." />
      )}
    </div>
  );
}
