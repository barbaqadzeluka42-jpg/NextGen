-- LOCAL TESTING ONLY. Run after migrations on a database prepared with 00_stub_supabase.sql.
\set ON_ERROR_STOP on
create schema if not exists t;
grant usage on schema t to anon, authenticated;
create or replace function t.fails(q text, pat text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm ilike '%'||pat||'%' then return; end if;
    raise exception 'FAIL: "%" raised "%" (expected %)', q, sqlerrm, pat;
  end;
  raise exception 'FAIL: "%" succeeded but should have failed (%)', q, pat;
end $$;
create or replace function t.eq(q text, expected text) returns void language plpgsql as $$
declare r text;
begin execute q into r;
  if r is distinct from expected then raise exception 'FAIL: "%" = % (expected %)', q, r, expected; end if;
end $$;
grant execute on all functions in schema t to anon, authenticated;

-- test-only: let fixtures choose ids (production clients never can)
grant insert (id) on public.events, public.projects to authenticated;
-- fixtures ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
 ('00000000-0000-0000-0000-00000000000a','alice@x.ge','{"full_name":"ალისა","terms_accepted":"true"}', now()),
 ('00000000-0000-0000-0000-00000000000b','bob@x.ge','{"full_name":"ბობი","role":"super_admin"}', now()),
 ('00000000-0000-0000-0000-00000000000c','carol@x.ge','{"full_name":"კაროლი"}', now()),
 ('00000000-0000-0000-0000-0000000000ad','admin@x.ge','{"full_name":"ადმინი"}', now()),
 ('00000000-0000-0000-0000-0000000000f0','sa@x.ge','{"full_name":"სუპერი"}', now());
select t.eq($$select count(*)::text from public.profiles$$, '5');
select t.eq($$select role::text from public.user_roles where user_id='00000000-0000-0000-0000-00000000000b'$$, 'student'); -- metadata cannot escalate
select t.eq($$select count(*)::text from public.notifications where type='welcome'$$, '5');
select t.eq($$select count(*)::text from public.email_outbox where kind='welcome'$$, '5');
-- promote (what the README tells the owner to do in the SQL editor)
update public.user_roles set role='admin' where user_id='00000000-0000-0000-0000-0000000000ad';
update public.user_roles set role='super_admin' where user_id='00000000-0000-0000-0000-0000000000f0';

-- student cannot escalate or write admin data ---------------------------
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
select t.fails($$update public.user_roles set role='admin' where user_id='00000000-0000-0000-0000-00000000000a'$$, 'permission denied');
select t.fails($$select public.set_user_role('00000000-0000-0000-0000-00000000000c','admin')$$, 'forbidden');
select t.fails($$insert into public.events (title,description,location,organizer,starts_at,registration_deadline,max_participants,created_by) values ('xxx','d','ll','oo',now()+interval '2 day',now()+interval '1 day',5,'00000000-0000-0000-0000-00000000000a')$$, 'row-level');
select t.fails($$select * from public.consume_rate_limit('k',1,1)$$, 'permission denied');
select t.fails($$select * from public.email_outbox$$, 'permission denied');
select t.eq($$select count(*)::text from public.profiles$$, '1');   -- only own profile visible
select t.fails($$update public.profiles set full_name='x' where id='00000000-0000-0000-0000-00000000000b'$$, 'zzz') where false;
update public.profiles set full_name='ალისა კ.' , grade=9 where id='00000000-0000-0000-0000-00000000000a';
select t.fails($$update public.profiles set id=gen_random_uuid() where id='00000000-0000-0000-0000-00000000000a'$$, 'permission denied');

-- admin creates events --------------------------------------------------
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
insert into public.events (id,title,description,category,location,organizer,starts_at,registration_deadline,max_participants,status,created_by)
values ('e0000000-0000-0000-0000-000000000001','ჭადრაკის ტურნირი','აღწერა','chess','დარბაზი','ადმინი',now()+interval '10 day',now()+interval '5 day',2,'draft','00000000-0000-0000-0000-0000000000ad'),
       ('e0000000-0000-0000-0000-000000000002','Brain Arena','აღწერა','quiz','კლასი','ადმინი',now()+interval '10 day',now()+interval '5 day',1,'published','00000000-0000-0000-0000-0000000000ad');
select t.fails($$insert into public.events (title,description,location,organizer,starts_at,registration_deadline,max_participants,created_by) values ('bad','d','ll','oo',now()+interval '1 day',now()+interval '2 day',5,'00000000-0000-0000-0000-0000000000ad')$$, 'events_deadline_before_start');
select t.fails($$update public.events set taken_seats=0 where id='e0000000-0000-0000-0000-000000000001'$$, 'permission denied');
-- draft → no notification yet, publish → notifications
reset role;
select t.eq($$select count(*)::text from public.notifications where type='new_event'$$, '5');      -- only event 2 so far
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
update public.events set status='published' where id='e0000000-0000-0000-0000-000000000001';
update public.events set status='draft' where id='e0000000-0000-0000-0000-000000000001';
update public.events set status='published' where id='e0000000-0000-0000-0000-000000000001';   -- must NOT notify twice
reset role;
select t.eq($$select count(*)::text from public.notifications where type='new_event'$$, '10');

-- visibility of drafts ---------------------------------------------------
reset role; set request.jwt.claim.sub = ''; set role anon;
select t.eq($$select count(*)::text from public.events$$, '2');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
insert into public.events (id,title,description,location,organizer,starts_at,registration_deadline,max_participants,created_by)
values ('e0000000-0000-0000-0000-000000000003','Draft','d','ll','oo',now()+interval '9 day',now()+interval '4 day',3,'00000000-0000-0000-0000-0000000000ad');
reset role; set request.jwt.claim.sub = ''; set role anon;
select t.eq($$select count(*)::text from public.events$$, '2');
select t.fails($$select * from public.profiles$$, 'permission denied');
select t.fails($$select public.register_for_event('e0000000-0000-0000-0000-000000000001')$$, 'permission denied');

-- registrations ----------------------------------------------------------
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
select t.eq($$select public.register_for_event('e0000000-0000-0000-0000-000000000001')::text$$, 'pending');
select t.fails($$select public.register_for_event('e0000000-0000-0000-0000-000000000001')$$, 'already_registered');
select t.fails($$select public.register_for_event('e0000000-0000-0000-0000-000000000003')$$, 'event_not_found');
select t.fails($$insert into public.event_registrations (event_id,user_id) values ('e0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000a')$$, 'permission denied');
select t.fails($$update public.event_registrations set status='approved'$$, 'permission denied');
select t.eq($$select public.register_for_event('e0000000-0000-0000-0000-000000000002')::text$$, 'pending');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b'; set role authenticated;
select t.fails($$select public.register_for_event('e0000000-0000-0000-0000-000000000002')$$, 'event_full');   -- capacity 1
select t.eq($$select public.register_for_event('e0000000-0000-0000-0000-000000000001')::text$$, 'pending');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c'; set role authenticated;
select t.fails($$select public.register_for_event('e0000000-0000-0000-0000-000000000001')$$, 'event_full');   -- capacity 2
select t.eq($$select count(*)::text from public.event_registrations$$, '0');     -- sees only own
select t.eq($$select taken_seats::text from public.events where id='e0000000-0000-0000-0000-000000000001'$$, '2');

-- cancel frees the seat, re-register works --------------------------------
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
select public.cancel_registration('e0000000-0000-0000-0000-000000000001');
select t.eq($$select taken_seats::text from public.events where id='e0000000-0000-0000-0000-000000000001'$$, '1');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c'; set role authenticated;
select t.eq($$select public.register_for_event('e0000000-0000-0000-0000-000000000001')::text$$, 'pending');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
select t.fails($$select public.register_for_event('e0000000-0000-0000-0000-000000000001')$$, 'event_full');

-- admin decisions ---------------------------------------------------------
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c'; set role authenticated;
select t.fails($$select public.decide_registration((select id from public.event_registrations limit 1),'approved')$$, 'forbidden');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
select public.decide_registration((select id from public.event_registrations where user_id='00000000-0000-0000-0000-00000000000c' and event_id='e0000000-0000-0000-0000-000000000001'),'approved');
select public.decide_registration((select id from public.event_registrations where user_id='00000000-0000-0000-0000-00000000000b' and event_id='e0000000-0000-0000-0000-000000000001'),'rejected');
select t.eq($$select taken_seats::text from public.events where id='e0000000-0000-0000-0000-000000000001'$$, '1');
select t.eq($$select count(*)::text from public.event_registrations where event_id='e0000000-0000-0000-0000-000000000001'$$, '3');
reset role;
select t.eq($$select count(*)::text from public.email_outbox where kind='registration_approved'$$, '1');
select t.eq($$select count(*)::text from public.email_outbox where kind='registration_rejected'$$, '1');
-- bob (rejected) may not re-register
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b'; set role authenticated;
select t.fails($$select public.register_for_event('e0000000-0000-0000-0000-000000000001')$$, 'registration_rejected');
-- notifications are private + read flag only
select t.eq($$select count(*)::text from public.notifications where user_id<>'00000000-0000-0000-0000-00000000000b'$$, '0');
select t.fails($$update public.notifications set title='hax'$$, 'permission denied');
update public.notifications set read_at=now();

-- event change / cancel → participants ---------------------------------------
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
update public.events set location='ახალი დარბაზი' where id='e0000000-0000-0000-0000-000000000001';
reset role;
select t.eq($$select count(*)::text from public.notifications where type='event_changed'$$, '1');   -- only the approved participant (carol); a & b inactive
select t.eq($$select count(*)::text from public.email_outbox where kind='event_changed'$$, '1');
update public.notification_preferences set email_event_changes=false where user_id='00000000-0000-0000-0000-00000000000c';
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
update public.events set location='კიდევ სხვა' where id='e0000000-0000-0000-0000-000000000001';
reset role;
select t.eq($$select count(*)::text from public.email_outbox where kind='event_changed'$$, '1');     -- pref respected
select t.eq($$select count(*)::text from public.notifications where type='event_changed'$$, '2');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
update public.events set status='cancelled' where id='e0000000-0000-0000-0000-000000000001';
reset role;
select t.eq($$select count(*)::text from public.email_outbox where kind='event_cancelled'$$, '1');   -- mandatory regardless of pref

-- capacity can't be lowered below taken seats ------------------------------------
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
select t.fails($$update public.events set max_participants=1 where id='e0000000-0000-0000-0000-000000000002'$$, 'zzz') where false;
insert into public.events (id,title,description,location,organizer,starts_at,registration_deadline,max_participants,status,created_by,auto_approve)
values ('e0000000-0000-0000-0000-000000000004','Auto','d','ll','oo',now()+interval '9 day',now()+interval '4 day',5,'published','00000000-0000-0000-0000-0000000000ad',true);
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
select t.eq($$select public.register_for_event('e0000000-0000-0000-0000-000000000004')::text$$, 'approved');
-- closed registration
reset role;
update public.events set registration_deadline = now() - interval '1 hour', starts_at = now() + interval '1 day' where id='e0000000-0000-0000-0000-000000000004';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c'; set role authenticated;
select t.fails($$select public.register_for_event('e0000000-0000-0000-0000-000000000004')$$, 'registration_closed');

-- projects -----------------------------------------------------------------------
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
insert into public.projects (id, owner_id, title, description, author_names, authors_consent)
values ('b0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','რობოტი','აღწერა აღწერა აღწერა',array['ალისა'], true);
select t.fails($$insert into public.projects (owner_id,title,description,author_names,moderation_status) values ('00000000-0000-0000-0000-00000000000a','abc','1234567890',array['a'],'approved')$$, 'permission denied');
select t.fails($$update public.projects set moderation_status='approved'$$, 'permission denied');
select t.fails($$insert into public.projects (owner_id,title,description,author_names) values ('00000000-0000-0000-0000-00000000000b','abc','1234567890',array['a'])$$, 'row-level');
reset role; set request.jwt.claim.sub = ''; set role anon;
select t.eq($$select count(*)::text from public.projects$$, '0');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
select public.moderate_project('b0000000-0000-0000-0000-000000000001','approved');
reset role; set request.jwt.claim.sub = ''; set role anon;
select t.eq($$select count(*)::text from public.projects$$, '1');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
update public.projects set title='რობოტი 2' where id='b0000000-0000-0000-0000-000000000001';   -- edit → back to moderation
select t.eq($$select moderation_status::text from public.projects where id='b0000000-0000-0000-0000-000000000001'$$, 'pending');
reset role; set request.jwt.claim.sub = ''; set role anon;
select t.eq($$select count(*)::text from public.projects$$, '0');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
insert into public.projects (id, owner_id, title, description, author_names, authors_consent)
values ('b0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000a','no consent','აღწერა აღწერა აღწერა',array['ალისა'], false);
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
select t.fails($$select public.moderate_project('b0000000-0000-0000-0000-000000000002','approved')$$, 'consent_required');

-- announcements --------------------------------------------------------------------
select t.fails($$insert into public.announcements (title,body,author_id) values ('abc','b','00000000-0000-0000-0000-0000000000f0')$$, 'row-level');
insert into public.announcements (title,body,is_important,is_published,author_id) values ('მნიშვნელოვანი','ტექსტი',true,true,'00000000-0000-0000-0000-0000000000ad');
reset role;
select t.eq($$select count(*)::text from public.email_outbox where kind='announcement'$$, '5');
select t.eq($$select count(*)::text from public.notifications where type='announcement'$$, '5');
reset role; set request.jwt.claim.sub = ''; set role anon;
select t.eq($$select count(*)::text from public.announcements$$, '1');

-- broadcast + roles ------------------------------------------------------------------
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad'; set role authenticated;
select t.eq($$select public.admin_send_notification('გამარჯობა','ტექსტი','/events')::text$$, '5');
select t.fails($$select public.admin_send_notification('გამარჯობა','ტექსტი','https://evil.example')$$, 'invalid_link');
select t.fails($$select public.admin_send_notification('გამარჯობა','ტექსტი','javascript:alert(1)')$$, 'invalid_link');
select t.fails($$select public.set_user_role('00000000-0000-0000-0000-00000000000c','admin')$$, 'forbidden');
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f0'; set role authenticated;
select public.set_user_role('00000000-0000-0000-0000-00000000000c','admin');
select t.fails($$select public.set_user_role('00000000-0000-0000-0000-0000000000f0','student')$$, 'cannot_change_own_role');
select t.eq($$select count(*)::text from public.audit_logs$$, (select count(*)::text from public.audit_logs));
reset role;
select action, count(*) from public.audit_logs group by 1 order by 1;
-- audit invisible to students
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b'; set role authenticated;
select t.eq($$select count(*)::text from public.audit_logs$$, '0');
-- export
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
select jsonb_object_keys(public.export_my_data());
-- storage
reset role; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
select t.fails($$insert into storage.objects (bucket_id,name) values ('project-images','00000000-0000-0000-0000-00000000000b/x.png')$$, 'row-level');
insert into storage.objects (bucket_id,name) values ('project-images','00000000-0000-0000-0000-00000000000a/x.png');

-- cascade: deleting a user removes personal data, keeps audit log ---------------------
reset role;
delete from auth.users where id='00000000-0000-0000-0000-00000000000a';
select t.eq($$select count(*)::text from public.profiles where id='00000000-0000-0000-0000-00000000000a'$$, '0') ;
select t.eq($$select count(*)::text from public.event_registrations where user_id='00000000-0000-0000-0000-00000000000a'$$, '0');
select 'ALL TESTS PASSED' as result;
