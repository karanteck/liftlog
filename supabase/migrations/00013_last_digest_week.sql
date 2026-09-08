-- 00013_last_digest_week.sql
-- Track which week's digest was last sent to prevent duplicate emails
-- when pg_cron fires more than once (e.g. during Supabase restarts).

alter table profiles add column last_digest_week text;
