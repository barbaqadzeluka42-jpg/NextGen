const DB_ERRORS: Record<string, string> = {
  not_authenticated: "გთხოვთ, შეხვიდე სისტემაში.",
  forbidden: "ამ მოქმედების უფლება არ გაქვს.",
  event_not_found: "ღონისძიება ვერ მოიძებნა ან ჯერ არ არის გამოქვეყნებული.",
  registration_closed: "რეგისტრაცია ამ ღონისძიებაზე დასრულებულია.",
  already_registered: "ამ ღონისძიებაზე უკვე დარეგისტრირებული ხარ.",
  registration_rejected: "ამ ღონისძიებაზე შენი განაცხადი უარყოფილია.",
  event_full: "სამწუხაროდ, ყველა ადგილი დაკავებულია.",
  cannot_cancel: "განაცხადის გაუქმება ვეღარ ხერხდება.",
  invalid_status: "არასწორი სტატუსი.",
  registration_not_found: "განაცხადი ვერ მოიძებნა.",
  project_not_found: "პროექტი ვერ მოიძებნა.",
  consent_required: "პროექტის გამოსაქვეყნებლად აუცილებელია ავტორების თანხმობა.",
  cannot_change_own_role: "საკუთარი როლის შეცვლა შეუძლებელია.",
  user_not_found: "მომხმარებელი ვერ მოიძებნა.",
  invalid_input: "მონაცემები არასწორია.",
  invalid_link: "ბმული უნდა იყოს საიტის შიდა მისამართი (მაგ. /events).",
};

/** Maps a Supabase/Postgres error to a safe, user-facing Georgian message. */
export function dbErrorMessage(error: { message?: string; code?: string } | null | undefined, fallback = "მოხდა შეცდომა. სცადე თავიდან.") {
  if (!error) return fallback;
  const msg = (error.message ?? "").trim();
  if (DB_ERRORS[msg]) return DB_ERRORS[msg];
  if (error.code === "23514" && msg.includes("events_seats_within_capacity"))
    return "მაქსიმალური რაოდენობა ვერ იქნება უკვე დაკავებული ადგილების რაოდენობაზე ნაკლები.";
  if (error.code === "23514" && msg.includes("events_deadline_before_start"))
    return "რეგისტრაციის ბოლო ვადა ღონისძიების დაწყებამდე უნდა იყოს.";
  if (error.code === "23514" && msg.includes("events_end_after_start"))
    return "დასრულების დრო დაწყების დროის შემდეგ უნდა იყოს.";
  if (error.code === "42501" || msg.includes("row-level security")) return DB_ERRORS.forbidden;
  console.error("db error", error.code, msg); // details stay in server logs
  return fallback;
}
