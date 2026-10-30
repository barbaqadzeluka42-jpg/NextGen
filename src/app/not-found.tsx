import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/layout-shell";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="container-page flex flex-col items-center py-24 text-center">
        <p className="text-gradient text-7xl font-black">404</p>
        <h1 className="mt-4 text-2xl font-bold">გვერდი ვერ მოიძებნა</h1>
        <p className="mt-2 text-muted-foreground">მისამართი შეიძლება არასწორია ან გვერდი აღარ არსებობს.</p>
        <Button asChild variant="gradient" size="lg" className="mt-6"><Link href="/">მთავარ გვერდზე დაბრუნება</Link></Button>
      </div>
    </PublicShell>
  );
}
