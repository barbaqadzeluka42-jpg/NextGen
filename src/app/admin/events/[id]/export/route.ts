import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/auth";
import { uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Spreadsheet formula injection guard
const cell = (v: unknown) => {
  const s = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer || !isAdminRole(viewer.role)) return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  if (!uuid.safeParse(id).success) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.from("event_registrations").select("status,created_at,profiles(full_name,grade)").eq("event_id", id).order("created_at");
  const rows = (data ?? []) as unknown as { status: string; created_at: string; profiles: { full_name: string; grade: number | null } | null }[];
  const csv = ["სახელი,კლასი,სტატუსი,გაგზავნის დრო", ...rows.map((r) => [r.profiles?.full_name, r.profiles?.grade, r.status, r.created_at].map(cell).join(","))].join("\n");
  return new NextResponse("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="participants-${id.slice(0, 8)}.csv"`, "Cache-Control": "no-store" },
  });
}
