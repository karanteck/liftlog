-- 00004_admin_read_all_profiles.sql
-- Allow admins to read all profiles so the admin panel can
-- list pending users for approval.

create policy "Admins read all profiles"
  on profiles for select
  using (auth_is_admin());
