-- NEXTGEN · 0001 · Schema: types, tables, constraints, indexes
-- Run order: 0001 → 0002 → 0003 → 0004 (Supabase CLI does this automatically,
-- or paste each file into the SQL Editor in order).

create extension if not exists pgcrypto;

create schema if not exists private;   -- internal helpers, NOT exposed through the API

-- ───────────────────────── Enumerated types ─────────────────────────
create type public.app_role            as enum ('student', 'admin', 'super_admin');
create type public.event_category      as enum ('chess', 'quiz', 'programming', 'debate', 'science', 'art', 'other');
create type public.event_status        as enum ('draft', 'published', 'cancelled', 'completed');
create type public.registration_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.project_category    as enum ('programming', 'robotics', 'science', 'design', 'art', 'other');
create type public.project_dev_status  as enum ('idea', 'in_progress', 'completed');
create type public.moderation_status   as enum ('pending', 'approved', 'rejected');

-- ───────────────────────── Schools (multi-school ready) ─────────────────────────
create table public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 2 and 120),
  slug       text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Profiles (1:1 with auth.users) ─────────────────────────
-- Privacy by design: only a display name is mandatory. Grade/school are optional.
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text not null check (char_length(btrim(full_name)) between 2 and 80),
  grade             smallint check (grade between 1 and 12),
  school_id         uuid references public.schools (id) on delete set null,
  terms_accepted_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index profiles_school_idx on public.profiles (school_id);

-- ───────────────────────── Roles (never taken from user input) ─────────────────────────
create table public.user_roles (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  role       public.app_role not null default 'student',
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create index user_roles_role_idx on public.user_roles (role);

-- ───────────────────────── Events ─────────────────────────
create table public.events (
  id                    uuid primary key default gen_random_uuid(),
  school_id             uuid references public.schools (id) on delete set null,  -- null = platform-wide
  title                 text not null check (char_length(btrim(title)) between 3 and 140),
  description           text not null check (char_length(btrim(description)) between 1 and 5000),
  category              public.event_category not null default 'other',
  starts_at             timestamptz not null,
  ends_at               timestamptz,
  location              text not null check (char_length(btrim(location)) between 2 and 200),
  registration_deadline timestamptz not null,
  max_participants      integer not null check (max_participants between 1 and 10000),
  organizer             text not null check (char_length(btrim(organizer)) between 2 and 120),
  rules                 text check (rules is null or char_length(rules) <= 4000),
  status                public.event_status not null default 'draft',
  auto_approve          boolean not null default false,
  taken_seats           integer not null default 0 check (taken_seats >= 0),  -- maintained by trigger only
  published_notified_at timestamptz,                                           -- maintained by trigger only
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint events_deadline_before_start check (registration_deadline <= starts_at),
  constraint events_end_after_start       check (ends_at is null or ends_at > starts_at),
  constraint events_seats_within_capacity check (taken_seats <= max_participants)
);
create index events_status_start_idx on public.events (status, starts_at);
create index events_school_idx       on public.events (school_id);

-- ───────────────────────── Registrations ─────────────────────────
create table public.event_registrations (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  status     public.registration_status not null default 'pending',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_registrations_unique_per_user unique (event_id, user_id)  -- no duplicate sign-ups
);
create index event_registrations_user_idx  on public.event_registrations (user_id, created_at desc);
create index event_registrations_event_idx on public.event_registrations (event_id, status);

-- ───────────────────────── Notifications ─────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (type in (
               'welcome', 'new_event', 'registration_received', 'registration_approved',
               'registration_rejected', 'event_changed', 'event_cancelled', 'announcement', 'admin_message')),
  title      text not null check (char_length(title) between 1 and 160),
  body       text check (body is null or char_length(body) <= 1000),
  -- internal links only: blocks javascript:, data: and external redirects
  link       text check (link is null or link ~ '^/[A-Za-z0-9/_?=&#.%-]*$'),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx       on public.notifications (user_id) where read_at is null;

create table public.notification_preferences (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  inapp_new_events    boolean not null default true,
  inapp_announcements boolean not null default true,
  email_event_changes boolean not null default true,
  email_announcements boolean not null default true,
  updated_at          timestamptz not null default now()
);

-- ───────────────────────── Announcements ─────────────────────────
create table public.announcements (
  id                    uuid primary key default gen_random_uuid(),
  school_id             uuid references public.schools (id) on delete set null,
  title                 text not null check (char_length(btrim(title)) between 3 and 140),
  body                  text not null check (char_length(btrim(body)) between 1 and 5000),
  is_important          boolean not null default false,   -- important ones are also e-mailed
  is_published          boolean not null default false,
  published_at          timestamptz,
  published_notified_at timestamptz,                       -- maintained by trigger only
  author_id             uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index announcements_published_idx on public.announcements (is_published, published_at desc);

-- ───────────────────────── Projects ─────────────────────────
create table public.projects (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(btrim(title)) between 3 and 120),
  description       text not null check (char_length(btrim(description)) between 10 and 3000),
  category          public.project_category not null default 'other',
  author_names      text[] not null check (cardinality(author_names) between 1 and 6),
  image_path        text check (image_path is null or (image_path !~ '\.\.' and char_length(image_path) <= 300)),
  dev_status        public.project_dev_status not null default 'idea',
  authors_consent   boolean not null default false,        -- all listed authors agreed to publish
  moderation_status public.moderation_status not null default 'pending',
  rejection_reason  text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  moderated_by      uuid,
  moderated_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- a project can never be public without the authors' consent
  constraint projects_public_needs_consent check (moderation_status <> 'approved' or authors_consent)
);
create index projects_public_idx on public.projects (moderation_status, created_at desc);
create index projects_owner_idx  on public.projects (owner_id);

-- ───────────────────────── Audit log ─────────────────────────
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,                       -- intentionally no FK: log outlives accounts
  action      text not null,
  entity_type text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx   on public.audit_logs (actor_id);

-- ───────────────────────── E-mail outbox (sent server-side only) ─────────────────────────
create table public.email_outbox (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  kind            text not null check (kind in (
                    'welcome', 'registration_received', 'registration_approved',
                    'registration_rejected', 'event_changed', 'event_cancelled', 'announcement')),
  payload         jsonb not null default '{}'::jsonb,
  dedupe_key      text,
  status          text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts        integer not null default 0,
  last_error      text,
  next_attempt_at timestamptz not null default now(),
  locked_at       timestamptz,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
create unique index email_outbox_dedupe_idx on public.email_outbox (dedupe_key) where dedupe_key is not null;
create index email_outbox_queue_idx on public.email_outbox (status, next_attempt_at);
create index email_outbox_sent_idx  on public.email_outbox (sent_at) where status = 'sent';

-- ───────────────────────── Rate limiting (works across serverless instances) ─────────────────────────
create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 0
);
