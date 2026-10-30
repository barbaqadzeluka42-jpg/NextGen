"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";

export interface NavItem { href: string; label: string }

export function MobileMenu({ items, children }: { items: NavItem[]; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="მენიუს გახსნა"><Menu /></Button>
      </DialogTrigger>
      <DialogContent side="left">
        <DialogTitle className="sr-only">ნავიგაცია</DialogTitle>
        <DialogDescription className="sr-only">საიტის მთავარი მენიუ</DialogDescription>
        <div className="mb-6"><Logo /></div>
        <nav aria-label="მთავარი მენიუ" className="flex flex-col gap-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
              className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium hover:bg-secondary">
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-2 border-t pt-6" onClick={() => setOpen(false)}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
