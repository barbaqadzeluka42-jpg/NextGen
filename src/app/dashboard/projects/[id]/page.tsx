import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { signedImageUrls } from "@/lib/project-images";
import { uuid } from "@/lib/validation";
import type { ProjectRow } from "@/lib/types";

export const metadata: Metadata = { title: "პროექტის რედაქტირება" };
export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser(`/dashboard/projects/${id}`);
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", id).eq("owner_id", viewer.id).maybeSingle();
  if (!data) notFound();
  const project = data as ProjectRow;
  const images = await signedImageUrls([project.image_path]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="პროექტის რედაქტირება" description="ცვლილების შემდეგ პროექტი ხელახლა გადის განხილვას." />
      <ProjectForm project={project} imageUrl={project.image_path ? images[project.image_path] : null} />
    </div>
  );
}
