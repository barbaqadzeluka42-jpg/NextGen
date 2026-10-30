"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cancelRegistration, registerForEvent } from "@/actions/events";
import { regVariant, type EventPhase } from "@/lib/events";
import { registrationStatusLabels } from "@/lib/constants";
import type { RegistrationStatus } from "@/lib/types";

export function RegisterButton({
  eventId, phase, myStatus, signedIn, canCancel,
}: { eventId: string; phase: EventPhase; myStatus: RegistrationStatus | null; signedIn: boolean; canCancel: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message });
    });

  const active = myStatus === "pending" || myStatus === "approved";

  return (
    <div className="space-y-3">
      {myStatus && myStatus !== "cancelled" && (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 text-muted-foreground" />
          შენი განაცხადი: <Badge variant={regVariant[myStatus]}>{registrationStatusLabels[myStatus]}</Badge>
        </div>
      )}

      {!signedIn ? (
        phase === "open" ? (
          <Button asChild size="lg" variant="gradient" className="w-full sm:w-auto">
            <Link href={`/login?next=${encodeURIComponent(`/events/${eventId}`)}`}>შედი სისტემაში დასარეგისტრირებლად</Link>
          </Button>
        ) : null
      ) : active ? (
        canCancel && (
          <Button variant="outline" size="lg" className="w-full sm:w-auto" disabled={pending}
            onClick={() => { if (confirm("დარწმუნებული ხარ, რომ გსურს განაცხადის გაუქმება?")) run(() => cancelRegistration(eventId)); }}>
            {pending && <Loader2 className="animate-spin" />} განაცხადის გაუქმება
          </Button>
        )
      ) : myStatus === "rejected" ? (
        <p className="text-sm text-muted-foreground">ამ ღონისძიებაზე განაცხადი უარყოფილია.</p>
      ) : phase === "open" ? (
        <Button size="lg" variant="gradient" className="w-full sm:w-auto" disabled={pending} onClick={() => run(() => registerForEvent(eventId))}>
          {pending && <Loader2 className="animate-spin" />} დარეგისტრირება
        </Button>
      ) : null}

      <div aria-live="polite" className="min-h-5 text-sm">
        {msg && <p className={msg.ok ? "text-success" : "text-destructive"}>{msg.text}</p>}
      </div>
    </div>
  );
}
