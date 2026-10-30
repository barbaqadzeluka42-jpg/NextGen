import Link from "next/link";
import { getViewer, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu, type NavItem } from "@/components/mobile-menu";
import { UserMenu } from "@/components/user-menu";

const NAV: NavItem[] = [
  { href: "/events", label: "ღონისძიებები" },
  { href: "/news", label: "სიახლეები" },
  { href: "/projects", label: "პროექტები" },
];

export async function SiteHeader() {
  const viewer = await getViewer();
  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    unread = count ?? 0;
  }
  const admin = viewer ? isAdminRole(viewer.role) : false;
  const mobileItems = viewer ? [...NAV, { href: "/dashboard", label: "ჩემი დაფა" }, ...(admin ? [{ href: "/admin", label: "ადმინისტრატორის პანელი" }] : [])] : NAV;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-2">
        <MobileMenu items={mobileItems}>
          {viewer ? null : (
            <>
              <Button asChild size="lg"><Link href="/register">რეგისტრაცია</Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/login">შესვლა</Link></Button>
            </>
          )}
        </MobileMenu>
        <Logo />
        <nav aria-label="მთავარი ნავიგაცია" className="ml-8 hidden items-center gap-1 md:flex">
          {NAV.map((i) => (
            <Link key={i.href} href={i.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {viewer ? (
            <UserMenu name={viewer.fullName} email={viewer.email} isAdmin={admin} unread={unread} />
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/login">შესვლა</Link></Button>
              <Button asChild variant="gradient" className="hidden sm:inline-flex"><Link href="/register">რეგისტრაცია</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
