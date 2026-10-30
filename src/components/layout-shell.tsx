import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[60dvh]">{children}</main>
      <SiteFooter />
    </>
  );
}
