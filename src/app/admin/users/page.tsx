import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RoleSelect } from "@/components/admin/forms";
import { fmtDate } from "@/lib/utils";
import type { Role } from "@/lib/types";

export const metadata: Metadata = { title: "ადმინისტრატორების მართვა" };
export const dynamic = "force-dynamic";

interface Row { id: string; full_name: string; grade: number | null; created_at: string; user_roles: { role: Role } | { role: Role }[] | null }

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireSuperAdmin();
  const q = ((await searchParams).q ?? "").trim().slice(0, 60).replace(/[%,()]/g, "");
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id,full_name,grade,created_at,user_roles(role)").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const roleOf = (r: Row): Role => (Array.isArray(r.user_roles) ? r.user_roles[0]?.role : r.user_roles?.role) ?? "student";
  return (
    <>
      <PageHeader title="ადმინისტრატორები" description="როლების მართვა. ახალი ადმინისტრატორის დასამატებლად ჯერ ის უნდა დარეგისტრირდეს, შემდეგ აქ შეცვალე მისი როლი. საკუთარ როლს ვერ შეცვლი." />
      <form className="mb-4 flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="ძებნა სახელით" aria-label="ძებნა სახელით" className="min-h-11 flex-1 rounded-lg border border-input bg-card px-3 sm:min-h-10" />
        <button className="min-h-11 rounded-lg bg-secondary px-4 text-sm font-semibold sm:min-h-10">ძებნა</button>
      </form>
      <Card><CardContent className="p-0">
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="truncate font-medium">{r.full_name}{r.id === viewer.id && <span className="text-muted-foreground"> (შენ)</span>}</p><p className="text-xs text-muted-foreground">რეგისტრაცია: {fmtDate(r.created_at)}{r.grade ? ` · ${r.grade} კლასი` : ""}</p></div>
              <RoleSelect userId={r.id} role={roleOf(r)} disabled={r.id === viewer.id} />
            </li>
          ))}
          {!rows.length && <li className="p-6 text-center text-sm text-muted-foreground">მომხმარებელი ვერ მოიძებნა.</li>}
        </ul>
      </CardContent></Card>
    </>
  );
}
