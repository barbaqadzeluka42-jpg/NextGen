-- NEXTGEN · 0002 · Helpers, triggers (integrity, notifications, audit) and RPCs
-- All SECURITY DEFINER functions pin search_path to '' and use fully-qualified names.

-- ───────────────────────── Role helpers (used by RLS) ─────────────────────────
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('admin', 'super_admin')
  );
$$;

create or replace function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'super_admin'
  );
$$;

-- ───────────────────────── Generic helpers ─────────────────────────
create or replace function private.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function private.enqueue_email(p_user uuid, p_kind text, p_payload jsonb, p_dedupe text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.email_outbox (user_id, kind, payload, dedupe_key)
  values (p_user, p_kind, coalesce(p_payload, '{}'::jsonb), p_dedupe)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
$$;

-- ───────────────────────── New user → profile, role, preferences ─────────────────────────
-- The role is ALWAYS 'student' here. raw_user_meta_data is user-controlled and is
-- only used for the display name and the terms checkbox, never for privileges.
create or replace function private.welcome_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, 'welcome', 'კეთილი იყოს შენი მობრძანება NEXTGEN-ში!',
          'შენი ელფოსტა დადასტურებულია. ნახე მომავალი ღონისძიებები და დარეგისტრირდი ერთი ღილაკით.', '/events');
  perform private.enqueue_email(p_user, 'welcome', '{}'::jsonb, 'welcome:' || p_user::text);
end $$;

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  v_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80);
  if char_length(v_name) < 2 then
    v_name := 'მოსწავლე';
  end if;

  insert into public.profiles (id, full_name, terms_accepted_at)
  values (new.id, v_name,
          case when (new.raw_user_meta_data ->> 'terms_accepted') = 'true' then now() end);
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  insert into public.notification_preferences (user_id) values (new.id);

  if new.email_confirmed_at is not null then
    perform private.welcome_user(new.id);
  end if;
  return new;
end $$;

create or replace function private.handle_user_confirmed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform private.welcome_user(new.id);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function private.handle_user_confirmed();

-- ───────────────────────── updated_at ─────────────────────────
create trigger profiles_touch      before update on public.profiles                 for each row execute function private.touch_updated_at();
create trigger events_touch        before update on public.events                   for each row execute function private.touch_updated_at();
create trigger registrations_touch before update on public.event_registrations      for each row execute function private.touch_updated_at();
create trigger announcements_touch before update on public.announcements            for each row execute function private.touch_updated_at();
create trigger projects_touch      before update on public.projects                  for each row execute function private.touch_updated_at();
create trigger prefs_touch         before update on public.notification_preferences for each row execute function private.touch_updated_at();

-- ───────────────────────── Capacity & duplicate protection ─────────────────────────
-- Serialises concurrent sign-ups for one event by locking the event row, then
-- re-counts active registrations in a fresh statement. Together with the
-- UNIQUE (event_id, user_id) constraint this makes over-booking and duplicates
-- impossible regardless of how the row is written.
create or replace function private.enforce_event_capacity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  ev public.events%rowtype;
  v_active_new boolean := new.status in ('pending', 'approved');
  v_active_old boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_active_old := old.status in ('pending', 'approved');
  end if;
  if v_active_new and not v_active_old then
    select * into ev from public.events where id = new.event_id for update;
    if not found then
      raise exception 'event_not_found' using errcode = 'P0001';
    end if;
    if (select count(*) from public.event_registrations r
         where r.event_id = new.event_id
           and r.status in ('pending', 'approved')
           and r.id <> new.id) >= ev.max_participants then
      raise exception 'event_full' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger registrations_capacity
  before insert or update of status on public.event_registrations
  for each row execute function private.enforce_event_capacity();

create or replace function private.sync_event_seats() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_event uuid := coalesce(new.event_id, old.event_id);
begin
  update public.events e
     set taken_seats = c.n
    from (select count(*)::int as n
            from public.event_registrations r
           where r.event_id = v_event and r.status in ('pending', 'approved')) c
   where e.id = v_event and e.taken_seats is distinct from c.n;
  return null;
end $$;

create trigger registrations_sync_seats
  after insert or update of status or delete on public.event_registrations
  for each row execute function private.sync_event_seats();

-- ───────────────────────── Registration notifications ─────────────────────────
create or replace function private.on_registration_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  ev      public.events%rowtype;
  v_kind  text;
  v_title text;
  v_body  text;
begin
  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then
      return null;
    end if;
  end if;

  v_kind := case new.status
              when 'approved' then 'registration_approved'
              when 'rejected' then 'registration_rejected'
              when 'pending'  then 'registration_received'
              else null end;
  if v_kind is null then
    return null;
  end if;

  select * into ev from public.events where id = new.event_id;
  if not found then
    return null;
  end if;

  v_title := case v_kind
               when 'registration_approved' then 'განაცხადი დადასტურებულია'
               when 'registration_rejected' then 'განაცხადი უარყოფილია'
               else 'განაცხადი მიღებულია' end;
  v_body := case v_kind
              when 'registration_approved' then 'ღონისძიება „' || ev.title || '“: შენი მონაწილეობა დადასტურდა.'
              when 'registration_rejected' then 'ღონისძიება „' || ev.title || '“: სამწუხაროდ, განაცხადი ვერ დაკმაყოფილდა.'
              else 'ღონისძიება „' || ev.title || '“: განაცხადი მიღებულია და ელოდება ადმინისტრატორის დადასტურებას.' end;

  insert into public.notifications (user_id, type, title, body, link)
  values (new.user_id, v_kind, v_title, v_body, '/events/' || ev.id::text);

  perform private.enqueue_email(new.user_id, v_kind,
    jsonb_build_object('event_id', ev.id, 'event_title', ev.title,
                       'starts_at', ev.starts_at, 'location', ev.location));
  return null;
end $$;

create trigger registrations_notify
  after insert or update of status on public.event_registrations
  for each row execute function private.on_registration_change();

-- ───────────────────────── Event publication & change notifications ─────────────────────────
create or replace function private.events_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    new.published_notified_at := old.published_notified_at;
  else
    new.published_notified_at := null;
  end if;
  if new.status = 'published' and new.published_notified_at is null then
    new.published_notified_at := now();
  end if;
  return new;
end $$;

create trigger events_before_write
  before insert or update on public.events
  for each row execute function private.events_before_write();

create or replace function private.on_event_after_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb;
  v_first   boolean;
  v_was_published boolean := false;
begin
  if tg_op = 'INSERT' then
    v_first := new.published_notified_at is not null;
  else
    v_first := new.published_notified_at is not null and old.published_notified_at is null;
    v_was_published := old.status = 'published';
  end if;

  -- 1) first publication → in-app notice for everyone who allows it
  if v_first then
    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'new_event', 'ახალი ღონისძიება', new.title, '/events/' || new.id::text
      from public.profiles p
      left join public.notification_preferences np on np.user_id = p.id
     where coalesce(np.inapp_new_events, true)
       and (new.school_id is null or p.school_id = new.school_id);
  end if;

  -- 2) important changes of a published event → active participants
  if v_was_published then
    v_payload := jsonb_build_object('event_id', new.id, 'event_title', new.title,
                                    'starts_at', new.starts_at, 'location', new.location);

    if new.status = 'cancelled' then
      insert into public.notifications (user_id, type, title, body, link)
      select r.user_id, 'event_cancelled', 'ღონისძიება გაუქმდა',
             'ღონისძიება „' || new.title || '“ გაუქმდა.', '/events/' || new.id::text
        from public.event_registrations r
       where r.event_id = new.id and r.status in ('pending', 'approved');

      insert into public.email_outbox (user_id, kind, payload)
      select r.user_id, 'event_cancelled', v_payload
        from public.event_registrations r
       where r.event_id = new.id and r.status in ('pending', 'approved');

    elsif new.status = 'published'
      and (old.starts_at is distinct from new.starts_at
        or old.ends_at is distinct from new.ends_at
        or old.location is distinct from new.location
        or old.registration_deadline is distinct from new.registration_deadline) then

      insert into public.notifications (user_id, type, title, body, link)
      select r.user_id, 'event_changed', 'ღონისძიების დეტალები შეიცვალა',
             'ღონისძიებაში „' || new.title || '“ შეიცვალა დრო ან ადგილი. გადაამოწმე დეტალები.',
             '/events/' || new.id::text
        from public.event_registrations r
       where r.event_id = new.id and r.status in ('pending', 'approved');

      insert into public.email_outbox (user_id, kind, payload)
      select r.user_id, 'event_changed', v_payload
        from public.event_registrations r
        left join public.notification_preferences np on np.user_id = r.user_id
       where r.event_id = new.id and r.status in ('pending', 'approved')
         and coalesce(np.email_event_changes, true);
    end if;
  end if;
  return null;
end $$;

create trigger events_after_write
  after insert or update on public.events
  for each row execute function private.on_event_after_write();

-- ───────────────────────── Announcement publication ─────────────────────────
create or replace function private.announcements_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    new.published_notified_at := old.published_notified_at;
    new.published_at := old.published_at;
  else
    new.published_notified_at := null;
    new.published_at := null;
  end if;
  if new.is_published then
    new.published_at := coalesce(new.published_at, now());
    new.published_notified_at := coalesce(new.published_notified_at, now());
  end if;
  return new;
end $$;

create trigger announcements_before_write
  before insert or update on public.announcements
  for each row execute function private.announcements_before_write();

create or replace function private.on_announcement_after_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_first boolean;
begin
  if tg_op = 'INSERT' then
    v_first := new.published_notified_at is not null;
  else
    v_first := new.published_notified_at is not null and old.published_notified_at is null;
  end if;

  if v_first then

    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'announcement', new.title, left(new.body, 300), '/news'
      from public.profiles p
      left join public.notification_preferences np on np.user_id = p.id
     where coalesce(np.inapp_announcements, true)
       and (new.school_id is null or p.school_id = new.school_id);

    if new.is_important then
      insert into public.email_outbox (user_id, kind, payload)
      select p.id, 'announcement',
             jsonb_build_object('announcement_id', new.id, 'title', new.title, 'excerpt', left(new.body, 400))
        from public.profiles p
        left join public.notification_preferences np on np.user_id = p.id
       where coalesce(np.email_announcements, true)
         and (new.school_id is null or p.school_id = new.school_id);
    end if;
  end if;
  return null;
end $$;

create trigger announcements_after_write
  after insert or update on public.announcements
  for each row execute function private.on_announcement_after_write();

-- ───────────────────────── Project guard: edits go back to moderation ─────────────────────────
create or replace function private.projects_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- owners (non-admin, authenticated) can never change moderation fields directly
  if auth.uid() is not null and not private.is_admin() then
    new.moderation_status := old.moderation_status;
    new.rejection_reason  := old.rejection_reason;
    new.moderated_by      := old.moderated_by;
    new.moderated_at      := old.moderated_at;
    if (new.title, new.description, new.category, new.author_names, new.image_path, new.dev_status, new.authors_consent)
       is distinct from
       (old.title, old.description, old.category, old.author_names, old.image_path, old.dev_status, old.authors_consent) then
      new.moderation_status := 'pending';
      new.rejection_reason  := null;
    end if;
  end if;
  return new;
end $$;

create trigger projects_guard
  before update on public.projects
  for each row execute function private.projects_before_update();

-- ───────────────────────── Audit log (admin actions only, tamper-proof) ─────────────────────────
create or replace function private.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  j_new   jsonb;
  j_old   jsonb;
  j       jsonb;
  v_changed text[];
begin
  if v_actor is null or not private.is_admin() then
    return null;
  end if;

  j_new := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  j_old := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  j := coalesce(j_new, j_old);

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_changed
      from jsonb_each(j_new) n
     where n.value is distinct from (j_old -> n.key)
       and n.key not in ('updated_at', 'taken_seats', 'published_notified_at');
    if v_changed is null then
      return null;
    end if;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(j ->> 'id', j ->> 'user_id'),
    jsonb_strip_nulls(jsonb_build_object(
      'changed', to_jsonb(v_changed),
      'title', j ->> 'title',
      'status', coalesce(j ->> 'moderation_status', j ->> 'status'),
      'previous_status', coalesce(j_old ->> 'moderation_status', j_old ->> 'status'),
      'role', j ->> 'role',
      'previous_role', j_old ->> 'role'
    ))
  );
  return null;
end $$;

create trigger events_audit         after insert or update or delete on public.events        for each row execute function private.audit_row_change();
create trigger announcements_audit  after insert or update or delete on public.announcements for each row execute function private.audit_row_change();
create trigger user_roles_audit     after update on public.user_roles                        for each row execute function private.audit_row_change();
create trigger projects_audit       after update or delete on public.projects                for each row execute function private.audit_row_change();
create trigger registrations_audit  after update of status on public.event_registrations     for each row execute function private.audit_row_change();

-- ═════════════════════════ RPCs (exposed through the API) ═════════════════════════
-- Errors are raised as short machine-readable codes; the app maps them to Georgian text.

create or replace function public.register_for_event(p_event_id uuid)
returns public.registration_status
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := auth.uid();
  ev       public.events%rowtype;
  reg      public.event_registrations%rowtype;
  v_status public.registration_status;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  -- lock the event row: concurrent sign-ups for the same event are serialised
  select * into ev from public.events where id = p_event_id and status = 'published' for update;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0001';
  end if;
  if now() > ev.registration_deadline or now() >= ev.starts_at then
    raise exception 'registration_closed' using errcode = 'P0001';
  end if;

  v_status := (case when ev.auto_approve then 'approved' else 'pending' end)::public.registration_status;

  select * into reg from public.event_registrations
   where event_id = p_event_id and user_id = v_uid for update;

  if found then
    if reg.status in ('pending', 'approved') then
      raise exception 'already_registered' using errcode = 'P0001';
    elsif reg.status = 'rejected' then
      raise exception 'registration_rejected' using errcode = 'P0001';
    end if;
    update public.event_registrations
       set status = v_status, decided_by = null,
           decided_at = case when v_status = 'approved' then now() end
     where id = reg.id;
  else
    insert into public.event_registrations (event_id, user_id, status, decided_at)
    values (p_event_id, v_uid, v_status, case when v_status = 'approved' then now() end);
  end if;
  return v_status;
end $$;

create or replace function public.cancel_registration(p_event_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  update public.event_registrations r
     set status = 'cancelled'
   where r.event_id = p_event_id and r.user_id = v_uid
     and r.status in ('pending', 'approved')
     and exists (select 1 from public.events e where e.id = r.event_id and now() < e.starts_at);
  if not found then
    raise exception 'cannot_cancel' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.decide_registration(p_registration_id uuid, p_status public.registration_status)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  update public.event_registrations
     set status = p_status, decided_by = auth.uid(), decided_at = now()
   where id = p_registration_id and status <> 'cancelled';
  if not found then
    raise exception 'registration_not_found' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.moderate_project(p_project_id uuid, p_status public.moderation_status, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  pr public.projects%rowtype;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select * into pr from public.projects where id = p_project_id for update;
  if not found then
    raise exception 'project_not_found' using errcode = 'P0001';
  end if;
  if p_status = 'approved' and not pr.authors_consent then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  update public.projects
     set moderation_status = p_status,
         rejection_reason  = case when p_status = 'rejected' then left(nullif(btrim(p_reason), ''), 500) end,
         moderated_by = auth.uid(), moderated_at = now()
   where id = p_project_id;

  if p_status in ('approved', 'rejected') then
    insert into public.notifications (user_id, type, title, body, link)
    values (pr.owner_id, 'admin_message',
            case when p_status = 'approved' then 'პროექტი გამოქვეყნდა' else 'პროექტი ვერ გამოქვეყნდა' end,
            'პროექტი „' || pr.title || '“' ||
              case when p_status = 'approved' then ' დამტკიცდა და ახლა საჯაროდ ჩანს გალერეაში.'
                   else ' არ დამტკიცდა.' || coalesce(' მიზეზი: ' || left(nullif(btrim(p_reason), ''), 300), '') end,
            '/dashboard/projects');
  end if;
end $$;

create or replace function public.set_user_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_change_own_role' using errcode = 'P0001';
  end if;
  update public.user_roles
     set role = p_role, updated_by = auth.uid(), updated_at = now()
   where user_id = p_user_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
end $$;

-- Admin broadcast: to everybody, or only to the active participants of one event.
create or replace function public.admin_send_notification(p_title text, p_body text, p_link text default null, p_event_id uuid default null)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
  v_title text := btrim(coalesce(p_title, ''));
  v_body  text := nullif(btrim(coalesce(p_body, '')), '');
  v_link  text := nullif(btrim(coalesce(p_link, '')), '');
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if char_length(v_title) not between 3 and 160 or char_length(coalesce(v_body, '')) > 1000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if v_link is not null and v_link !~ '^/[A-Za-z0-9/_?=&#.%-]*$' then
    raise exception 'invalid_link' using errcode = 'P0001';
  end if;

  if p_event_id is null then
    insert into public.notifications (user_id, type, title, body, link)
    select id, 'admin_message', v_title, v_body, v_link from public.profiles;
  else
    insert into public.notifications (user_id, type, title, body, link)
    select r.user_id, 'admin_message', v_title, v_body, v_link
      from public.event_registrations r
     where r.event_id = p_event_id and r.status in ('pending', 'approved');
  end if;
  get diagnostics v_count = row_count;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'notifications.broadcast', 'notifications', p_event_id::text,
          jsonb_strip_nulls(jsonb_build_object('title', v_title, 'recipients', v_count)));
  return v_count;
end $$;

-- Data portability / "right of access": everything stored about the caller.
create or replace function public.export_my_data()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'role', (select ur.role from public.user_roles ur where ur.user_id = v_uid),
    'preferences', (select to_jsonb(np) from public.notification_preferences np where np.user_id = v_uid),
    'registrations', coalesce((select jsonb_agg(to_jsonb(r)) from public.event_registrations r where r.user_id = v_uid), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(to_jsonb(pr)) from public.projects pr where pr.owner_id = v_uid), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(to_jsonb(n)) from public.notifications n where n.user_id = v_uid), '[]'::jsonb)
  );
end $$;

-- ───────────────────────── Server-only helpers (service_role) ─────────────────────────
create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds)
                            then now() else rl.window_start end,
        count        = case when rl.window_start < now() - make_interval(secs => p_window_seconds)
                            then 1 else rl.count + 1 end
  returning count into v_count;
  return v_count <= p_limit;
end $$;

-- Atomically claims a batch of e-mails (safe with parallel workers).
create or replace function public.claim_email_outbox(p_limit integer)
returns setof public.email_outbox
language sql security definer set search_path = '' as $$
  update public.email_outbox o
     set status = 'sending', attempts = o.attempts + 1, locked_at = now()
   where o.id in (
     select id from public.email_outbox
      where (status = 'pending' and next_attempt_at <= now())
         or (status = 'sending' and locked_at < now() - interval '10 minutes')
      order by created_at
      limit greatest(p_limit, 0)
      for update skip locked)
  returning o.*;
$$;

-- Resolves e-mail addresses for the outbox worker (addresses never leave the server).
create or replace function public.get_user_email(p_user_id uuid)
returns table (email text, confirmed boolean)
language sql stable security definer set search_path = '' as $$
  select u.email::text, (u.email_confirmed_at is not null) from auth.users u where u.id = p_user_id;
$$;
