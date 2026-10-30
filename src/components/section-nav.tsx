"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Bell, CalendarDays, CalendarPlus, FolderKanban, LayoutDashboard, Megaphone, ScrollText, Send, Settings, ShieldCheck, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { home: LayoutDashboard, bell: Bell, projects: FolderKanban, settings: Settings, stats: BarChart3, events: CalendarDays, news: Megaphone, send: Send, users: Users, audit: ScrollText, shield: ShieldCheck, plus: CalendarPlus };
export type IconKey = keyof typeof ICONS;
export interface SectionItem { href: string; label: string; short?: string; icon: IconKey; badge?: number; exact?: boolean }

function useActive() {
  const pathname = usePathname();
  return (i: SectionItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));
}

/** Sidebar on md+, fixed bottom tab bar on phones (thumb-friendly). */
export function SectionNav({ items, title }: { items: SectionItem[]; title: string }) {
  const isActive = useActive();
  return (
    <>
      <nav aria-label={title} className="sticky top-24 hidden w-56 shrink-0 self-start md:block">
        <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <ul className="space-y-1">
          {items.map((i) => {
            const Icon = ICONS[i.icon];
            const active = isActive(i);
            return (
              <li key={i.href}>
                <Link href={i.href} aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                  <Icon className="size-4.5" /> <span className="flex-1">{i.label}</span>
                  {!!i.badge && <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-5 text-white">{i.badge > 99 ? "99+" : i.badge}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav aria-label={title} className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-xl md:hidden">
        <ul className="mx-auto flex max-w-xl">
          {items.map((i) => {
            const Icon = ICONS[i.icon];
            const active = isActive(i);
            return (
              <li key={i.href} className="min-w-0 flex-1">
                <Link href={i.href} aria-current={active ? "page" : undefined}
                  className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                  <span className="relative">
                    <Icon className="size-5" />
                    {!!i.badge && <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-white">{i.badge > 9 ? "9+" : i.badge}</span>}
                  </span>
                  <span className="max-w-full truncate">{i.short ?? i.label}</span>
                  {active && <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
