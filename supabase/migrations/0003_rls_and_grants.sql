-- NEXTGEN · 0003 · Row Level Security + least-privilege grants
-- Principle: deny by default. Tables are only readable/writable through the
-- policies below; sensitive writes go through SECURITY DEFINER RPCs (0002).

-- ───────────────────────── Reset Supabase's permissive defaults ─────────────────────────
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin(), private.is_super_admin() to anon, authenticated;

-- ───────────────────────── Enable RLS everywhere ─────────────────────────
alter table public.schools                  enable row level security;
alter table public.profiles                 enable row level security;
alter table public.user_roles               enable row level security;
alter table public.events                   enable row level security;
alter table public.event_registrations      enable row level security;
alter table public.notifications            enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.announcements            enable row level security;
alter table public.projects                 enable row level security;
alter table public.audit_logs               enable row level security;
alter table public.email_outbox             enable row level security;  -- no policies: service_role only
alter table public.rate_limits              enable row level security;  -- no policies: service_role only

-- ───────────────────────── schools ─────────────────────────
grant select on public.schools to anon, authenticated;
create policy schools_read on public.schools for select to anon, authenticated using (true);

-- ───────────────────────── profiles ─────────────────────────
-- Rows are created by the signup trigger only (no INSERT grant).
grant select on public.profiles to authenticated;
grant update (full_name, grade) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ───────────────────────── user_roles ─────────────────────────
-- Read-only for clients. Changes: public.set_user_role() (super admin) or SQL editor.
grant select on public.user_roles to authenticated;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

-- ───────────────────────── events ─────────────────────────
grant select on public.events to anon, authenticated;
grant insert (school_id, title, description, category, starts_at, ends_at, location,
              registration_deadline, max_participants, organizer, rules, status, auto_approve, created_by)
  on public.events to authenticated;
grant update (school_id, title, description, category, starts_at, ends_at, location,
              registration_deadline, max_participants, organizer, rules, status, auto_approve)
  on public.events to authenticated;
grant delete on public.events to authenticated;

create policy events_read on public.events for select to anon, authenticated
  using (status <> 'draft' or private.is_admin());
create policy events_insert_admin on public.events for insert to authenticated
  with check (private.is_admin() and created_by = (select auth.uid()));
create policy events_update_admin on public.events for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy events_delete_admin on public.events for delete to authenticated
  using (private.is_admin());

-- ───────────────────────── event_registrations ─────────────────────────
-- No INSERT/UPDATE/DELETE grants: use register_for_event / cancel_registration / decide_registration.
grant select on public.event_registrations to authenticated;
create policy registrations_select on public.event_registrations for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

-- ───────────────────────── notifications ─────────────────────────
-- Created only by triggers / admin_send_notification (SECURITY DEFINER).
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.notification_preferences to authenticated;
grant update (inapp_new_events, inapp_announcements, email_event_changes, email_announcements)
  on public.notification_preferences to authenticated;
create policy prefs_select on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy prefs_update on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────────────────────── announcements ─────────────────────────
grant select on public.announcements to anon, authenticated;
grant insert (school_id, title, body, is_important, is_published, author_id) on public.announcements to authenticated;
grant update (school_id, title, body, is_important, is_published) on public.announcements to authenticated;
grant delete on public.announcements to authenticated;

create policy announcements_read on public.announcements for select to anon, authenticated
  using (is_published or private.is_admin());
create policy announcements_insert_admin on public.announcements for insert to authenticated
  with check (private.is_admin() and author_id = (select auth.uid()));
create policy announcements_update_admin on public.announcements for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy announcements_delete_admin on public.announcements for delete to authenticated
  using (private.is_admin());

-- ───────────────────────── projects ─────────────────────────
-- moderation_status / rejection_reason are NOT writable by clients (see moderate_project).
grant select on public.projects to anon, authenticated;
grant insert (owner_id, title, description, category, author_names, image_path, dev_status, authors_consent)
  on public.projects to authenticated;
grant update (title, description, category, author_names, image_path, dev_status, authors_consent)
  on public.projects to authenticated;
grant delete on public.projects to authenticated;

create policy projects_read on public.projects for select to anon, authenticated
  using (moderation_status = 'approved' or owner_id = (select auth.uid()) or private.is_admin());
create policy projects_insert_own on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy projects_update_own on public.projects for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy projects_delete on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin());

-- ───────────────────────── audit_logs (read-only for admins; written by triggers) ─────────────────────────
grant select on public.audit_logs to authenticated;
create policy audit_select_admin on public.audit_logs for select to authenticated
  using (private.is_admin());

-- ───────────────────────── RPC permissions ─────────────────────────
grant execute on function public.register_for_event(uuid)                              to authenticated;
grant execute on function public.cancel_registration(uuid)                             to authenticated;
grant execute on function public.decide_registration(uuid, public.registration_status) to authenticated;
grant execute on function public.moderate_project(uuid, public.moderation_status, text) to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role)                  to authenticated;
grant execute on function public.admin_send_notification(text, text, text, uuid)       to authenticated;
grant execute on function public.export_my_data()                                      to authenticated;

-- Server-only (service_role key, never reachable from the browser)
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.claim_email_outbox(integer)                to service_role;
grant execute on function public.get_user_email(uuid)                       to service_role;
