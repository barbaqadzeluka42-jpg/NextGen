import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { eventCategoryLabels } from "@/lib/constants";
import { eventPhase, phaseMeta } from "@/lib/events";
import { fmtDay, fmtMonthShort, fmtTime } from "@/lib/utils";
import type { EventRow } from "@/lib/types";

export function EventCard({ event }: { event: EventRow }) {
  const phase = eventPhase(event);
  const meta = phaseMeta[phase];
  const pct = Math.min(100, Math.round((event.taken_seats / event.max_participants) * 100));
  return (
    <Link
      href={`/events/${event.id}`}
      className="group relative flex gap-4 rounded-xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 sm:p-5"
    >
      <div aria-hidden className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary sm:size-[4.5rem]">
        <span className="text-2xl font-extrabold leading-none sm:text-3xl">{fmtDay(event.starts_at)}</span>
        <span className="mt-1 text-xs font-semibold uppercase">{fmtMonthShort(event.starts_at)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{eventCategoryLabels[event.category]}</Badge>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <h3 className="text-base font-bold leading-snug group-hover:text-primary sm:text-lg">{event.title}</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0" /><span>{fmtTime(event.starts_at)}</span></li>
          <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0" /><span className="truncate">{event.location}</span></li>
          <li className="flex items-center gap-2">
            <Users className="size-4 shrink-0" />
            <span>{event.taken_seats} / {event.max_participants}</span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`შევსებულია ${pct}%`}>
              <span className="block h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
            </span>
          </li>
        </ul>
      </div>
    </Link>
  );
}
