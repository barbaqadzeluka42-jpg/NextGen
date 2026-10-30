import { PublicShell } from "@/components/layout-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
