-- 00005_admin_read_all_households.sql
-- Allow admins to read all households so the admin panel can
-- list and assign users to them.

create policy "Admins read all households"
  on households for select
  using (auth_is_admin());
