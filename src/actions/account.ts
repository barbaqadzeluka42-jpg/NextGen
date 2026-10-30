"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { actionViewer } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { fieldErrors, preferencesSchema, profileSchema, uuid } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await actionViewer();
  if (!viewer) return { message: "შედი სისტემაში." };
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, grade: parsed.data.grade })
    .eq("id", viewer.id);
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "პროფილი შენახულია." };
}

export async function updatePreferences(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await actionViewer();
  if (!viewer) return { message: "შედი სისტემაში." };
  const parsed = preferencesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "მონაცემები არასწორია." };

  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").update(parsed.data).eq("user_id", viewer.id);
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/dashboard/settings");
  return { ok: true, message: "შეტყობინებების პარამეტრები შენახულია." };
}

export async function markNotificationRead(id: string) {
  const viewer = await actionViewer();
  if (!viewer || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  revalidatePath("/dashboard", "layout");
}

export async function markAllNotificationsRead() {
  const viewer = await actionViewer();
  if (!viewer) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.id).is("read_at", null);
  revalidatePath("/dashboard", "layout");
}

export async function deleteNotification(id: string) {
  const viewer = await actionViewer();
  if (!viewer || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", id);
  revalidatePath("/dashboard", "layout");
}

/**
 * Right to erasure. Removes the auth user; ON DELETE CASCADE deletes the profile, role,
 * registrations, notifications, preferences, projects and queued e-mails. Project images are removed first.
 */
export async function deleteAccount(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await actionViewer();
  if (!viewer) return { message: "შედი სისტემაში." };
  if (String(formData.get("confirm") ?? "").trim() !== "წაშლა") return { errors: { confirm: ["დასადასტურებლად ჩაწერე სიტყვა: წაშლა"] } };
  if (!hasServiceRole()) return { message: "ანგარიშის წაშლა დროებით მიუწვდომელია. მოგვწერე ელფოსტით." };

  const admin = createAdminClient();
  if (viewer.role === "super_admin") {
    const { count } = await admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "super_admin");
    if ((count ?? 0) <= 1) return { message: "ბოლო სუპერ ადმინის ანგარიშის წაშლა შეუძლებელია. ჯერ სხვას მიანიჭე ეს როლი." };
  }

  const { data: files } = await admin.storage.from("project-images").list(viewer.id, { limit: 200 });
  if (files?.length) await admin.storage.from("project-images").remove(files.map((f) => `${viewer.id}/${f.name}`));

  const { error } = await admin.auth.admin.deleteUser(viewer.id);
  if (error) {
    console.error("deleteUser", error.message);
    return { message: "ანგარიშის წაშლა ვერ მოხერხდა. სცადე თავიდან." };
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
