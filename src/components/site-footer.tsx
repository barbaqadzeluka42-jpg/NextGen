import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/logo";
import { contactEmail } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-card/40">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            საგანმანათლებლო პლატფორმა მოსწავლეებისთვის: კონკურსები, ტურნირები და საკუთარი პროექტების გამოქვეყნება ერთ სივრცეში.
          </p>
        </div>
        <nav aria-label="ნავიგაცია footer-ში" className="space-y-3 text-sm">
          <p className="font-semibold">პლატფორმა</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/events">ღონისძიებები</Link></li>
            <li><Link className="hover:text-foreground" href="/news">სიახლეები</Link></li>
            <li><Link className="hover:text-foreground" href="/projects">პროექტების გალერეა</Link></li>
            <li><Link className="hover:text-foreground" href="/register">რეგისტრაცია</Link></li>
          </ul>
        </nav>
        <div className="space-y-3 text-sm">
          <p className="font-semibold">კონტაქტი და კონფიდენციალურობა</p>
          <ul className="space-y-2 text-muted-foreground">
            {contactEmail && (
              <li><a className="inline-flex items-center gap-2 hover:text-foreground" href={`mailto:${contactEmail}`}><Mail className="size-4" />{contactEmail}</a></li>
            )}
            <li><Link className="hover:text-foreground" href="/privacy">კონფიდენციალურობის პოლიტიკა</Link></li>
            <li><Link className="hover:text-foreground" href="/terms">გამოყენების წესები</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} NEXTGEN</div>
    </footer>
  );
}
