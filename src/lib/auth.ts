import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface Viewer {
  id: string;
  email: string;
  fullName: string;
  grade: number | null;
  role: Role;
}

/** Validated against the Supabase Auth server on every call (never trusts the cookie alone). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, grade, user_roles(role)")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const rel = profile.user_roles as { role: Role } | { role: Role }[] | null;
  const role = (Array.isArray(rel) ? rel[0]?.role : rel?.role) ?? "student";
  return { id: user.id, email: user.email ?? "", fullName: profile.full_name, grade: profile.grade, role };
});

export const isAdminRole = (r: Role) => r === "admin" || r === "super_admin";

export async function requireUser(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return viewer;
}

/** Admin pages & actions. Non-admins get a 404 so the area's existence isn't revealed. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/admin");
  if (!isAdminRole(viewer.role)) notFound();
  return viewer;
}

export async function requireSuperAdmin(): Promise<Viewer> {
  const viewer = await requireAdmin();
  if (viewer.role !== "super_admin") notFound();
  return viewer;
}

/** For server actions: returns null instead of redirecting. */
export async function actionViewer(kind: "user" | "admin" | "super_admin" = "user"): Promise<Viewer | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  if (kind === "admin" && !isAdminRole(viewer.role)) return null;
  if (kind === "super_admin" && viewer.role !== "super_admin") return null;
  return viewer;
}
