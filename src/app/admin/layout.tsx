import { SiteHeader } from "@/components/site-header";
import { SectionNav, type SectionItem } from "@/components/section-nav";
import { requireAdmin } from "@/lib/auth";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireAdmin();
  const items: SectionItem[] = [
    { href: "/admin", label: "მიმოხილვა", short: "მიმოხ.", icon: "stats", exact: true },
    { href: "/admin/events", label: "ღონისძიებები", short: "ღონისძ.", icon: "events" },
    { href: "/admin/news", label: "სიახლეები", short: "სიახლე", icon: "news" },
    { href: "/admin/projects", label: "პროექტები", short: "პროექტ.", icon: "projects" },
    { href: "/admin/notifications", label: "შეტყობინებები", short: "შეტყობ.", icon: "send" },
    ...(viewer.role === "super_admin" ? [{ href: "/admin/users", label: "ადმინისტრატორები", short: "როლები", icon: "users" as const }] : []),
    { href: "/admin/audit", label: "აუდიტის ჟურნალი", short: "ჟურნალი", icon: "audit" },
  ];
  return (
    <>
      <SiteHeader />
      <div className="container-page flex gap-10 py-6 pb-28 sm:py-10 md:pb-10">
        <SectionNav items={items} title="ადმინისტრირება" />
        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
