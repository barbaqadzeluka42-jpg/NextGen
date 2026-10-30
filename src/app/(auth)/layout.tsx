import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-hero">
      <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
      <header className="container-page flex h-16 items-center justify-between"><Logo /><ThemeToggle /></header>
      <main id="main" className="container-page flex flex-1 items-start justify-center py-6 sm:items-center sm:py-12">
        <div className="w-full max-w-md animate-fade-up rounded-2xl border bg-card/90 p-5 shadow-xl shadow-primary/10 backdrop-blur sm:p-8">{children}</div>
      </main>
    </div>
  );
}
