"use client";
import { useState, useTransition } from "react";
import { Ban, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form";
import { decideRegistration, deleteEvent, setEventStatus } from "@/actions/admin";
import type { ActionState } from "@/lib/types";

export function DecisionButtons({ registrationId, status }: { registrationId: string; status: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>();
  const run = (s: "approved" | "rejected") => start(async () => setMsg(await decideRegistration(registrationId, s)));
  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {status !== "approved" && <Button size="sm" disabled={pending} onClick={() => run("approved")}><Check /> დამტკიცება</Button>}
        {status !== "rejected" && <Button size="sm" variant="outline" disabled={pending} onClick={() => run("rejected")}><X /> უარყოფა</Button>}
      </div>
      {msg && !msg.ok && <p role="alert" className="text-xs text-destructive">{msg.message}</p>}
    </div>
  );
}

export function EventDangerZone({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>();
  return (
    <div className="space-y-3">
      <FormAlert state={msg ?? {}} />
      <div className="flex flex-wrap gap-2">
        {status !== "cancelled" && (
          <Button variant="outline" disabled={pending}
            onClick={() => { if (confirm("გაუქმდეს ღონისძიება? ყველა მონაწილეს შეტყობინება გაეგზავნება.")) start(async () => setMsg(await setEventStatus(id, "cancelled"))); }}>
            <Ban /> ღონისძიების გაუქმება
          </Button>
        )}
        {status === "published" && (
          <Button variant="outline" disabled={pending} onClick={() => start(async () => setMsg(await setEventStatus(id, "completed")))}>დასრულებულად მონიშვნა</Button>
        )}
        <Button variant="destructive" disabled={pending}
          onClick={() => { if (confirm("წაიშალოს ღონისძიება სამუდამოდ?")) start(async () => { const r = await deleteEvent(id); if (r) setMsg(r); }); }}>
          <Trash2 /> წაშლა
        </Button>
      </div>
    </div>
  );
}
