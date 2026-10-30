import type { EventRow, RegistrationStatus } from "@/lib/types";

export type EventPhase = "open" | "full" | "closed" | "cancelled" | "past";

export function eventPhase(e: Pick<EventRow, "status" | "starts_at" | "ends_at" | "registration_deadline" | "max_participants" | "taken_seats">, now = new Date()): EventPhase {
  if (e.status === "cancelled") return "cancelled";
  const end = new Date(e.ends_at ?? e.starts_at);
  if (e.status === "completed" || now > end) return "past";
  if (now > new Date(e.registration_deadline) || now >= new Date(e.starts_at)) return "closed";
  if (e.taken_seats >= e.max_participants) return "full";
  return "open";
}

export const phaseMeta: Record<EventPhase, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  open: { label: "რეგისტრაცია ღიაა", variant: "success" },
  full: { label: "ადგილები ამოიწურა", variant: "warning" },
  closed: { label: "რეგისტრაცია დასრულდა", variant: "secondary" },
  cancelled: { label: "გაუქმებულია", variant: "destructive" },
  past: { label: "დასრულდა", variant: "secondary" },
};

export const regVariant: Record<RegistrationStatus, "warning" | "success" | "destructive" | "secondary"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "secondary",
};

export const EVENT_COLUMNS =
  "id,title,description,category,starts_at,ends_at,location,registration_deadline,max_participants,organizer,rules,status,auto_approve,taken_seats,created_at";
