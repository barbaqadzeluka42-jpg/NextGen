import { describe, expect, it } from "vitest";
import { fromInputValue, safeNext, toInputValue } from "@/lib/utils";
import { sniffImage } from "@/lib/upload";
import { escapeHtml, renderEmail } from "@/lib/email/templates";
import { eventSchema, projectSchema, registerSchema } from "@/lib/validation";
import { dbErrorMessage } from "@/lib/errors";
import { eventPhase } from "@/lib/events";

describe("safeNext (open-redirect guard)", () => {
  it("allows only same-site paths", () => {
    expect(safeNext("/events/1")).toBe("/events/1");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});

describe("Tbilisi datetime conversion", () => {
  it("round-trips", () => {
    const iso = fromInputValue("2026-11-07T18:30")!;
    expect(iso).toBe("2026-11-07T14:30:00.000Z");
    expect(toInputValue(iso)).toBe("2026-11-07T18:30");
  });
  it("rejects garbage", () => expect(fromInputValue("tomorrow")).toBeNull());
});

describe("sniffImage (never trusts the file name / mime)", () => {
  const pad = (b: number[]) => new Uint8Array([...b, ...new Array(20).fill(0)]);
  it("detects real formats", () => {
    expect(sniffImage(pad([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe("png");
    expect(sniffImage(new TextEncoder().encode("RIFF....WEBPVP8 xxxx"))?.ext).toBe("webp");
  });
  it("rejects html/svg/scripts", () => {
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)></svg>   "))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<?php echo 1; ?>          "))).toBeNull();
  });
});

describe("e-mail templates", () => {
  it("escapes user-controlled values", () => {
    const r = renderEmail("registration_approved", { event_title: '<img src=x onerror=alert(1)>', event_id: "abc", location: '"><script>' })!;
    expect(r.html).not.toContain("<img src=x");
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;img");
  });
  it("returns null for unknown kinds", () => expect(renderEmail("nope", {})).toBeNull());
  it("escapeHtml", () => expect(escapeHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;"));
});

describe("validation", () => {
  it("register: needs consent + strong-enough password", () => {
    const base = { fullName: "ნინო კ", email: "A@B.ge", password: "abc12345", terms: "on", ageConsent: "on" };
    const ok = registerSchema.safeParse(base);
    expect(ok.success && ok.data.email).toBe("a@b.ge");
    expect(registerSchema.safeParse({ ...base, terms: undefined }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "abcdefgh" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "a1" }).success).toBe(false);
  });
  it("register: role fields are not part of the schema", () => {
    const r = registerSchema.safeParse({ fullName: "ნინო კ", email: "a@b.ge", password: "abc12345", terms: "on", ageConsent: "on", role: "super_admin" });
    expect(r.success && "role" in r.data).toBe(false);
  });
  const ev = { title: "ტურნირი", description: "აღწერა", category: "chess", starts_at: "2026-11-07T18:00", ends_at: "", location: "დარბაზი", registration_deadline: "2026-11-05T18:00", max_participants: "20", organizer: "ადმინი", rules: "", status: "draft" };
  it("event: deadline must precede start", () => {
    expect(eventSchema.safeParse(ev).success).toBe(true);
    expect(eventSchema.safeParse({ ...ev, registration_deadline: "2026-11-08T18:00" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...ev, max_participants: "0" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...ev, category: "hacking" }).success).toBe(false);
  });
  it("project: parses author list", () => {
    const r = projectSchema.safeParse({ title: "რობოტი", description: "აღწერა აღწერა", category: "robotics", dev_status: "idea", authors: "ნინო\nგიორგი, დათო", authors_consent: "on" });
    expect(r.success && r.data.authors).toEqual(["ნინო", "გიორგი", "დათო"]);
  });
});

describe("error mapping", () => {
  it("maps DB codes and hides internals", () => {
    expect(dbErrorMessage({ message: "event_full" })).toContain("ადგილი");
    expect(dbErrorMessage({ message: 'relation "x" does not exist', code: "42P01" })).not.toContain("relation");
  });
});

describe("eventPhase", () => {
  const base = { status: "published" as const, starts_at: "2030-01-10T10:00:00Z", ends_at: null, registration_deadline: "2030-01-05T10:00:00Z", max_participants: 2, taken_seats: 0 };
  const now = new Date("2030-01-01T00:00:00Z");
  it("derives phases", () => {
    expect(eventPhase(base, now)).toBe("open");
    expect(eventPhase({ ...base, taken_seats: 2 }, now)).toBe("full");
    expect(eventPhase(base, new Date("2030-01-06T00:00:00Z"))).toBe("closed");
    expect(eventPhase(base, new Date("2030-02-01T00:00:00Z"))).toBe("past");
    expect(eventPhase({ ...base, status: "cancelled" }, now)).toBe("cancelled");
  });
});
