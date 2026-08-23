-- Enable pg_cron and pg_net extensions for the weekly digest email.
-- pg_cron: schedules recurring tasks inside Postgres.
-- pg_net: lets Postgres make HTTP requests to external services.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
