"use client";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex min-h-dvh flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-bold">დაფიქსირდა შეცდომა</h1>
      <p className="mt-2 max-w-md text-muted-foreground">სცადე გვერდის თავიდან ჩატვირთვა. თუ პრობლემა გრძელდება, მოგვიანებით დაბრუნდი.</p>
      <Button className="mt-6" size="lg" onClick={reset}>თავიდან ცდა</Button>
    </div>
  );
}
