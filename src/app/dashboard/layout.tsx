import { SiteHeader } from "@/components/site-header";
import { SectionNav, type SectionItem } from "@/components/section-nav";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/dashboard");
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  const items: SectionItem[] = [
    { href: "/dashboard", label: "მთავარი", icon: "home", exact: true },
    { href: "/dashboard/notifications", label: "შეტყობინებები", short: "შეტყობ.", icon: "bell", badge: count ?? 0 },
    { href: "/dashboard/projects", label: "ჩემი პროექტები", short: "პროექტები", icon: "projects" },
    { href: "/dashboard/settings", label: "პარამეტრები", icon: "settings" },
  ];
  return (
    <>
      <SiteHeader />
      <div className="container-page flex gap-10 py-6 pb-28 sm:py-10 md:pb-10">
        <SectionNav items={items} title="ჩემი დაფა" />
        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
