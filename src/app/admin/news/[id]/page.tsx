import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AnnouncementForm } from "@/components/admin/forms";
import { uuid } from "@/lib/validation";
import type { AnnouncementRow } from "@/lib/types";

export const metadata = { title: "სიახლის რედაქტირება" };
export const dynamic = "force-dynamic";

export default async function EditAnnouncement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("id,title,body,is_important,is_published,published_at,created_at").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <div className="max-w-2xl"><PageHeader title="სიახლის რედაქტირება" /><AnnouncementForm item={data as AnnouncementRow} /></div>;
}
