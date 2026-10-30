export type Role = "student" | "admin" | "super_admin";
export type EventCategory = "chess" | "quiz" | "programming" | "debate" | "science" | "art" | "other";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ProjectCategory = "programming" | "robotics" | "science" | "design" | "art" | "other";
export type ProjectDevStatus = "idea" | "in_progress" | "completed";
export type ModerationStatus = "pending" | "approved" | "rejected";

export interface EventRow {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string;
  registration_deadline: string;
  max_participants: number;
  organizer: string;
  rules: string | null;
  status: EventStatus;
  auto_approve: boolean;
  taken_seats: number;
  created_at: string;
}

export interface RegistrationRow {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  created_at: string;
  decided_at: string | null;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  is_important: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  author_names: string[];
  image_path: string | null;
  dev_status: ProjectDevStatus;
  authors_consent: boolean;
  moderation_status: ModerationStatus;
  rejection_reason: string | null;
  created_at: string;
}

export interface PreferencesRow {
  inapp_new_events: boolean;
  inapp_announcements: boolean;
  email_event_changes: boolean;
  email_announcements: boolean;
}

export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
}
