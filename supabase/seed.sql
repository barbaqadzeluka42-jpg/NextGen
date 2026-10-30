-- NEXTGEN · first Super Admin
-- No admin is ever created through the website. After the future Super Admin has
-- registered AND confirmed their e-mail, run this ONCE in Supabase → SQL Editor
-- (the SQL editor runs as the database owner, which is why it is allowed to change roles):

update public.user_roles
   set role = 'super_admin'
 where user_id = (select id from auth.users where email = 'PUT-THE-EMAIL-HERE@example.com');

-- Verify:
-- select p.full_name, r.role from public.user_roles r join public.profiles p on p.id = r.user_id where r.role <> 'student';

-- Optional – a school record for the multi-school structure (profiles.school_id / events.school_id):
-- insert into public.schools (name, slug) values ('YOUR SCHOOL NAME', 'your-school');
