"use client";
import Link from "next/link";
import { LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOut } from "@/actions/auth";

export function UserMenu({ name, email, isAdmin, unread }: { name: string; email: string; isAdmin: boolean; unread: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative grid size-11 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:size-10"
        aria-label={`ანგარიშის მენიუ${unread ? `, ${unread} წაუკითხავი შეტყობინება` : ""}`}>
        {initial}
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-5 text-white">{unread > 9 ? "9+" : unread}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="block truncate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/dashboard"><LayoutDashboard /> ჩემი დაფა</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/dashboard/settings"><Settings /> პარამეტრები</Link></DropdownMenuItem>
        {isAdmin && <DropdownMenuItem asChild><Link href="/admin"><ShieldCheck /> ადმინისტრატორის პანელი</Link></DropdownMenuItem>}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full"><LogOut /> გასვლა</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
