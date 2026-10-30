"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actionViewer } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { rateLimit, TOO_MANY } from "@/lib/rate-limit";
import { scheduleEmailFlush } from "@/lib/email/outbox";
import { uuid } from "@/lib/validation";
import type { RegistrationStatus } from "@/lib/types";

export interface RegisterResult {
  ok: boolean;
  message: string;
  status?: RegistrationStatus;
}

/**
 * One-click sign-up. The heavy lifting (row lock, capacity check, duplicate check)
 * happens inside the database function public.register_for_event.
 */
export async function registerForEvent(eventId: string): Promise<RegisterResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, message: "რეგისტრაციისთვის შედი სისტემაში." };
  if (!uuid.safeParse(eventId).success) return { ok: false, message: "არასწორი ღონისძიება." };
  if (!(await rateLimit(`register:${viewer.id}`, 20, 600))) return { ok: false, message: TOO_MANY };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_event", { p_event_id: eventId });
  if (error) return { ok: false, message: dbErrorMessage(error) };

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  scheduleEmailFlush();
  const status = data as RegistrationStatus;
  return {
    ok: true,
    status,
    message: status === "approved" ? "მონაწილეობა დადასტურებულია!" : "განაცხადი გაგზავნილია. დადასტურებას ელოდები.",
  };
}

export async function cancelRegistration(eventId: string): Promise<RegisterResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, message: "შედი სისტემაში." };
  if (!uuid.safeParse(eventId).success) return { ok: false, message: "არასწორი ღონისძიება." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_registration", { p_event_id: eventId });
  if (error) return { ok: false, message: dbErrorMessage(error) };

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "განაცხადი გაუქმებულია.", status: "cancelled" };
}
