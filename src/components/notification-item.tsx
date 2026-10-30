"use client";
import { useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteNotification, markNotificationRead } from "@/actions/account";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/lib/types";

export function NotificationItem({ n, when }: { n: NotificationRow; when: string }) {
  const [pending, start] = useTransition();
  const body = (
    <>
      <span className="flex items-center gap-2">
        {!n.read_at && <span aria-label="წაუკითხავი" className="size-2 shrink-0 rounded-full bg-primary" />}
        <span className="font-semibold">{n.title}</span>
      </span>
      {n.body && <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>}
      <time dateTime={n.created_at} className="mt-1 block text-xs text-muted-foreground">{when}</time>
    </>
  );
  return (
    <li className={cn("flex items-start gap-2 px-4 py-3 sm:px-5", !n.read_at && "bg-primary/5", pending && "opacity-50")}>
      {n.link ? (
        <Link href={n.link} className="min-w-0 flex-1" onClick={() => { if (!n.read_at) start(() => markNotificationRead(n.id)); }}>{body}</Link>
      ) : (
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { if (!n.read_at) start(() => markNotificationRead(n.id)); }}>{body}</button>
      )}
      <Button variant="ghost" size="icon" aria-label="შეტყობინების წაშლა" disabled={pending} onClick={() => start(() => deleteNotification(n.id))}><Trash2 /></Button>
    </li>
  );
}
