import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5 font-extrabold tracking-[0.08em]", className)} aria-label="NEXTGEN — მთავარი">
      <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md shadow-primary/30 transition-transform group-hover:rotate-6">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19V5l14 14V5" />
        </svg>
      </span>
      <span className="text-lg">NEXT<span className="text-gradient">GEN</span></span>
    </Link>
  );
}
