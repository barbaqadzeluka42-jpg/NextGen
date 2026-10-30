"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { actionViewer } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { rateLimit, TOO_MANY } from "@/lib/rate-limit";
import { fieldErrors, projectSchema, uuid } from "@/lib/validation";
import { MAX_IMAGE_BYTES, sniffImage } from "@/lib/upload";
import type { ActionState } from "@/lib/types";

const BUCKET = "project-images";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function uploadImage(supabase: Supabase, userId: string, file: File): Promise<{ path?: string; error?: string }> {
  if (file.size > MAX_IMAGE_BYTES) return { error: "სურათი 2 მბ-ზე დიდია." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { error: "დასაშვებია მხოლოდ JPG, PNG ან WebP სურათი." };
  const path = `${userId}/${randomUUID()}.${kind.ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (error) {
    console.error("upload", error.message);
    return { error: "სურათის ატვირთვა ვერ მოხერხდა." };
  }
  return { path };
}

function parseProject(formData: FormData) {
  return projectSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    dev_status: formData.get("dev_status") ?? "",
    authors: formData.get("authors") ?? "",
    authors_consent: formData.get("authors_consent") ?? "",
  });
}

export async function saveProject(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await actionViewer();
  if (!viewer) return { message: "შედი სისტემაში." };
  const parsed = parseProject(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "გადაამოწმე შევსებული ველები." };
  const p = parsed.data;
  if (!(await rateLimit(`project:${viewer.id}`, 15, 3600))) return { message: TOO_MANY };

  const id = String(formData.get("id") ?? "");
  const isEdit = id !== "";
  if (isEdit && !uuid.safeParse(id).success) return { message: "არასწორი პროექტი." };

  const supabase = await createClient();
  let previousImage: string | null = null;
  if (isEdit) {
    const { data: existing } = await supabase.from("projects").select("image_path").eq("id", id).eq("owner_id", viewer.id).maybeSingle();
    if (!existing) return { message: "პროექტი ვერ მოიძებნა." };
    previousImage = existing.image_path;
  }

  let newImage: string | undefined;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(supabase, viewer.id, file);
    if (up.error) return { errors: { image: [up.error] } };
    newImage = up.path;
  }
  const removeImage = formData.get("remove_image") === "on";

  const values = {
    title: p.title,
    description: p.description,
    category: p.category,
    dev_status: p.dev_status,
    author_names: p.authors,
    authors_consent: p.authors_consent,
    ...(newImage ? { image_path: newImage } : removeImage ? { image_path: null } : {}),
  };

  const { error } = isEdit
    ? await supabase.from("projects").update(values).eq("id", id).eq("owner_id", viewer.id)
    : await supabase.from("projects").insert({ ...values, owner_id: viewer.id });

  if (error) {
    if (newImage) await supabase.storage.from(BUCKET).remove([newImage]);
    return { message: dbErrorMessage(error) };
  }
  if (previousImage && (newImage || removeImage)) await supabase.storage.from(BUCKET).remove([previousImage]);

  revalidatePath("/dashboard/projects");
  revalidatePath("/projects");
  redirect("/dashboard/projects?saved=1");
}

export async function deleteProject(id: string) {
  const viewer = await actionViewer();
  if (!viewer || !uuid.safeParse(id).success) return;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("image_path").eq("id", id).eq("owner_id", viewer.id).maybeSingle();
  if (!data) return;
  await supabase.from("projects").delete().eq("id", id).eq("owner_id", viewer.id);
  if (data.image_path) await supabase.storage.from(BUCKET).remove([data.image_path]);
  revalidatePath("/dashboard/projects");
  revalidatePath("/projects");
}
