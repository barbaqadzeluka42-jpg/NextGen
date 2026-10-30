"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actionViewer } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { scheduleEmailFlush } from "@/lib/email/outbox";
import { announcementSchema, eventSchema, fieldErrors, notificationSchema, uuid } from "@/lib/validation";
import type { ActionState, ModerationStatus, RegistrationStatus, Role } from "@/lib/types";

const FORBIDDEN: ActionState = { message: "ამ მოქმედების უფლება არ გაქვს." };

// Every action re-checks the role on the server; RLS / RPC checks in Postgres are the second, independent layer.

export async function saveEvent(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await actionViewer("admin");
  if (!viewer) return FORBIDDEN;
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "გადაამოწმე შევსებული ველები." };

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  if (id) {
    if (!uuid.safeParse(id).success) return { message: "არასწორი ღონისძიება." };
    const { error } = await supabase.from("events").update(parsed.data).eq("id", id);
    if (error) return { message: dbErrorMessage(error) };
    revalidatePath("/", "layout");
    scheduleEmailFlush();
    return { ok: true, message: "ცვლილებები შენახულია. თუ დრო/ადგილი შეიცვალა, მონაწილეებს შეტყობინება გაეგზავნათ." };
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.data, created_by: viewer.id })
    .select("id")
    .single();
  if (error || !data) return { message: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  redirect(`/admin/events/${data.id}?created=1`);
}

export async function deleteEvent(id: string): Promise<ActionState> {
  const viewer = await actionViewer("admin");
  if (!viewer) return FORBIDDEN;
  if (!uuid.safeParse(id).success) return { message: "არასწორი ღონისძიება." };
  const supabase = await createClient();
  const { count } = await supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", id);
  if ((count ?? 0) > 0) return { message: "ღონისძიებას განაცხადები აქვს. წაშლის ნაცვლად გააუქმე — მონაწილეები შეტყობინებას მიიღებენ." };
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  redirect("/admin/events");
}

export async function setEventStatus(id: string, status: "cancelled" | "published" | "completed"): Promise<ActionState> {
  const viewer = await actionViewer("admin");
  if (!viewer) return FORBIDDEN;
  if (!uuid.safeParse(id).success) return { message: "არასწორი ღონისძიება." };
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ status }).eq("id", id);
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  scheduleEmailFlush();
  return { ok: true, message: status === "cancelled" ? "ღონისძიება გაუქმებულია, მონაწილეებს შეტყობინება გაეგზავნათ." : "სტატუსი შეცვლილია." };
}

export async function decideRegistration(registrationId: string, status: Extract<RegistrationStatus, "approved" | "rejected">): Promise<ActionState> {
  const viewer = await actionViewer("admin");
  if (!viewer) return FORBIDDEN;
  if (!uuid.safeParse(registrationId).success || !["approved", "rejected"].includes(status)) return { message: "არასწორი მოთხოვნა." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_registration", { p_registration_id: registrationId, p_status: status });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/admin", "layout");
  scheduleEmailFlush();
  return { ok: true, message: status === "approved" ? "განაცხადი დამტკიცებულია." : "განაცხადი უარყოფილია." };
}

export async function saveAnnouncement(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await actionViewer("admin");
  if (!viewer) return FORBIDDEN;
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("announcements").update(parsed.data).eq("id", id)
    : await supabase.from("announcements").insert({ ...parsed.data, author_id: viewer.id });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  scheduleEmailFlush();
  if (!id) redirect("/admin/news?saved=1");
  return { ok: true, message: "შენახულია." };
}

export async function deleteAnnouncement(id: string) {
  const viewer = await actionViewer("admin");
  if (!viewer || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function moderateProject(id: string, status: ModerationStatus, reason?: string): Promise<ActionState> {
  const viewer = await actionViewer("admin");
  if (!viewer) return FORBIDDEN;
  if (!uuid.safeParse(id).success) return { message: "არასწორი პროექტი." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_project", { p_project_id: id, p_status: status, p_reason: reason ?? null });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: status === "approved" ? "პროექტი გამოქვეყნდა." : "პროექტი უარყოფილია." };
}

export async function deleteProjectAsAdmin(id: string) {
  const viewer = await actionViewer("admin");
  if (!viewer || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("image_path").eq("id", id).maybeSingle();
  await supabase.from("projects").delete().eq("id", id);
  if (data?.image_path) await supabase.storage.from("project-images").remove([data.image_path]);
  revalidatePath("/", "layout");
}

export async function sendNotification(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await actionViewer("admin");
  if (!viewer) return FORBIDDEN;
  const parsed = notificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_send_notification", {
    p_title: parsed.data.title,
    p_body: parsed.data.body || null,
    p_link: parsed.data.link || null,
    p_event_id: parsed.data.event_id || null,
  });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/admin/notifications");
  return { ok: true, message: `შეტყობინება გაიგზავნა ${data} მომხმარებელთან.` };
}

export async function setUserRole(userId: string, role: Role): Promise<ActionState> {
  const viewer = await actionViewer("super_admin");
  if (!viewer) return FORBIDDEN;
  if (!uuid.safeParse(userId).success || !["student", "admin", "super_admin"].includes(role)) return { message: "არასწორი მოთხოვნა." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/admin/users");
  return { ok: true, message: "როლი შეცვლილია." };
}
