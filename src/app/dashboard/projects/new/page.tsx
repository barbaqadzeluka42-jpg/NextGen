import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/projects/project-form";

export const metadata: Metadata = { title: "ახალი პროექტი" };

export default async function NewProjectPage() {
  await requireUser("/dashboard/projects/new");
  return (
    <div className="max-w-2xl">
      <PageHeader title="ახალი პროექტი" />
      <ProjectForm />
    </div>
  );
}
