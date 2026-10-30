import { z } from "zod";
import { enumKeys, eventCategoryLabels, eventStatusLabels, projectCategoryLabels, projectDevLabels } from "@/lib/constants";
import { fromInputValue } from "@/lib/utils";

export const fieldErrors = (e: z.ZodError) => z.flattenError(e).fieldErrors as Record<string, string[] | undefined>;

const trimmed = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label}: მინიმუმ ${min} სიმბოლო`).max(max, `${label}: მაქსიმუმ ${max} სიმბოლო`);

/** FormData checkbox → boolean */
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const emailSchema = z.string().trim().toLowerCase().email("მიუთითე სწორი ელფოსტა").max(254);

export const passwordSchema = z
  .string()
  .min(8, "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს")
  .max(72, "პაროლი ძალიან გრძელია")
  .refine((p) => /[A-Za-zა-ჰ]/.test(p) && /\d/.test(p), "პაროლი უნდა შეიცავდეს ასოსაც და ციფრსაც");

export const registerSchema = z.object({
  fullName: trimmed(2, 80, "სახელი"),
  email: emailSchema,
  password: passwordSchema,
  terms: checkbox.refine((v) => v, "გასაგრძელებლად დაეთანხმე წესებს"),
  ageConsent: checkbox.refine((v) => v, "დასტური აუცილებელია"),
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "შეიყვანე პაროლი").max(72) });
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ password: passwordSchema });

export const profileSchema = z.object({
  fullName: trimmed(2, 80, "სახელი"),
  grade: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(1, "კლასი 1-დან 12-მდე").max(12, "კლასი 1-დან 12-მდე").nullable(),
  ),
});

export const preferencesSchema = z.object({
  inapp_new_events: checkbox,
  inapp_announcements: checkbox,
  email_event_changes: checkbox,
  email_announcements: checkbox,
});

const dateTime = (label: string) =>
  z.string().transform((v, ctx) => {
    const iso = fromInputValue(v);
    if (!iso) ctx.addIssue({ code: "custom", message: `${label}: მიუთითე თარიღი და დრო` });
    return iso as string;
  });

export const eventSchema = z
  .object({
    title: trimmed(3, 140, "სათაური"),
    description: trimmed(1, 5000, "აღწერა"),
    category: z.enum(enumKeys(eventCategoryLabels)),
    starts_at: dateTime("დაწყება"),
    ends_at: z.string().transform((v, ctx) => {
      if (!v) return null;
      const iso = fromInputValue(v);
      if (!iso) ctx.addIssue({ code: "custom", message: "დასრულება: არასწორი თარიღი" });
      return iso;
    }),
    location: trimmed(2, 200, "ადგილი"),
    registration_deadline: dateTime("რეგისტრაციის ბოლო ვადა"),
    max_participants: z.coerce.number({ error: "მიუთითე რიცხვი" }).int().min(1, "მინიმუმ 1").max(10000, "მაქსიმუმ 10000"),
    organizer: trimmed(2, 120, "ორგანიზატორი"),
    rules: z.string().trim().max(4000, "წესები: მაქსიმუმ 4000 სიმბოლო").transform((v) => v || null),
    status: z.enum(enumKeys(eventStatusLabels)),
    auto_approve: checkbox,
  })
  .refine((e) => !e.starts_at || !e.registration_deadline || e.registration_deadline <= e.starts_at, {
    path: ["registration_deadline"],
    message: "რეგისტრაციის ბოლო ვადა ღონისძიების დაწყებამდე უნდა იყოს",
  })
  .refine((e) => !e.ends_at || !e.starts_at || e.ends_at > e.starts_at, {
    path: ["ends_at"],
    message: "დასრულება დაწყების შემდეგ უნდა იყოს",
  });

export const announcementSchema = z.object({
  title: trimmed(3, 140, "სათაური"),
  body: trimmed(1, 5000, "ტექსტი"),
  is_important: checkbox,
  is_published: checkbox,
});

export const notificationSchema = z.object({
  title: trimmed(3, 160, "სათაური"),
  body: z.string().trim().max(1000, "ტექსტი: მაქსიმუმ 1000 სიმბოლო"),
  link: z.string().trim().max(200).regex(/^(\/[A-Za-z0-9/_?=&#.%-]*)?$/, "ბმული უნდა იყოს საიტის შიდა მისამართი, მაგ. /events"),
  event_id: z.string().uuid().or(z.literal("")),
});

export const projectSchema = z.object({
  title: trimmed(3, 120, "სახელი"),
  description: trimmed(10, 3000, "აღწერა"),
  category: z.enum(enumKeys(projectCategoryLabels)),
  dev_status: z.enum(enumKeys(projectDevLabels)),
  authors: z
    .string()
    .transform((v) => v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string().min(2, "ავტორის სახელი ძალიან მოკლეა").max(60, "ავტორის სახელი ძალიან გრძელია")).min(1, "მიუთითე მინიმუმ ერთი ავტორი").max(6, "მაქსიმუმ 6 ავტორი")),
  authors_consent: checkbox,
});

export const uuid = z.string().uuid();
