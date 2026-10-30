import type {
  EventCategory, EventStatus, ModerationStatus, ProjectCategory, ProjectDevStatus, RegistrationStatus, Role,
} from "./types";

export const SITE_NAME = "NEXTGEN";

export const eventCategoryLabels: Record<EventCategory, string> = {
  chess: "ჭადრაკი",
  quiz: "ვიქტორინა",
  programming: "პროგრამირება",
  debate: "დებატები",
  science: "მეცნიერება",
  art: "ხელოვნება",
  other: "სხვა",
};
export const eventStatusLabels: Record<EventStatus, string> = {
  draft: "დრაფტი",
  published: "გამოქვეყნებული",
  cancelled: "გაუქმებული",
  completed: "დასრულებული",
};
export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  pending: "განხილვაშია",
  approved: "დადასტურებულია",
  rejected: "უარყოფილია",
  cancelled: "გაუქმებულია",
};
export const projectCategoryLabels: Record<ProjectCategory, string> = {
  programming: "პროგრამირება",
  robotics: "რობოტიკა",
  science: "მეცნიერება",
  design: "დიზაინი",
  art: "ხელოვნება",
  other: "სხვა",
};
export const projectDevLabels: Record<ProjectDevStatus, string> = {
  idea: "იდეა",
  in_progress: "მუშავდება",
  completed: "დასრულებულია",
};
export const moderationLabels: Record<ModerationStatus, string> = {
  pending: "მოდერაციაზეა",
  approved: "გამოქვეყნებულია",
  rejected: "უარყოფილია",
};
export const roleLabels: Record<Role, string> = {
  student: "მოსწავლე",
  admin: "ადმინისტრატორი",
  super_admin: "სუპერ ადმინი",
};

export const enumKeys = <T extends string>(o: Record<T, string>) => Object.keys(o) as [T, ...T[]];

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
