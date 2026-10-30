import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EventForm } from "@/components/admin/event-form";

export const metadata: Metadata = { title: "ახალი ღონისძიება" };

export default async function NewEventPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <PageHeader title="ახალი ღონისძიება" />
      <EventForm />
    </div>
  );
}
