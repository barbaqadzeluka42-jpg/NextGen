import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "Asia/Tbilisi"; // fixed UTC+4, no DST

export function fmtDateTime(iso: string | Date) {
  return new Intl.DateTimeFormat("ka-GE", { dateStyle: "medium", timeStyle: "short", timeZone: TZ }).format(new Date(iso));
}
export function fmtDate(iso: string | Date) {
  return new Intl.DateTimeFormat("ka-GE", { dateStyle: "long", timeZone: TZ }).format(new Date(iso));
}
export function fmtDay(iso: string | Date) {
  return new Intl.DateTimeFormat("ka-GE", { day: "numeric", timeZone: TZ }).format(new Date(iso));
}
export function fmtMonthShort(iso: string | Date) {
  return new Intl.DateTimeFormat("ka-GE", { month: "short", timeZone: TZ }).format(new Date(iso));
}
export function fmtTime(iso: string | Date) {
  return new Intl.DateTimeFormat("ka-GE", { timeStyle: "short", timeZone: TZ }).format(new Date(iso));
}

/** ISO → value for <input type="datetime-local"> in Tbilisi time */
export function toInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
  return s.replace(" ", "T");
}

/** <input type="datetime-local"> value (Tbilisi time) → ISO string, or null if invalid */
export function fromInputValue(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+04:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Allow only same-site relative paths (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}
