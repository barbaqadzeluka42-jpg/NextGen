import type { Metadata } from "next";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { NotificationItem } from "@/components/notification-item";
import { markAllNotificationsRead } from "@/actions/account";
import { fmtDateTime } from "@/lib/utils";
import type { NotificationRow } from "@/lib/types";

export const metadata: Metadata = { title: "შეტყობინებები" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireUser("/dashboard/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id,type,title,body,link,read_at,created_at").order("created_at", { ascending: false }).limit(100);
  const items = (data ?? []) as NotificationRow[];
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <>
      <PageHeader title="შეტყობინებები" description={unread ? `${unread} წაუკითხავი` : "ყველა შეტყობინება წაკითხულია"}>
        {unread > 0 && (
          <form action={markAllNotificationsRead}><Button type="submit" variant="outline"><CheckCheck /> ყველას წაკითხულად მონიშვნა</Button></form>
        )}
      </PageHeader>
      {items.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">{items.map((n) => <NotificationItem key={n.id} n={n} when={fmtDateTime(n.created_at)} />)}</ul>
      ) : (
        <EmptyState icon={<Bell />} title="შეტყობინებები არ გაქვს" description="აქ გამოჩნდება ახალი ღონისძიებები, განაცხადის სტატუსი და მნიშვნელოვანი ცვლილებები." />
      )}
    </>
  );
}
