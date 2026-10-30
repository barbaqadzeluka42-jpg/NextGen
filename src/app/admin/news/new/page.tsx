import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AnnouncementForm } from "@/components/admin/forms";

export const metadata = { title: "ახალი სიახლე" };

export default async function NewAnnouncement() {
  await requireAdmin();
  return <div className="max-w-2xl"><PageHeader title="ახალი სიახლე" /><AnnouncementForm /></div>;
}
