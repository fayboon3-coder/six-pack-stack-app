-- Six-Pack Stack app: daily use + visible results (version 9)
-- Weigh-ins, food log, photo/label scans, push tokens and Boon's weekly focus.
-- Run once in Supabase → SQL editor. Safe to run again.
-- The app works before this runs (it saves on the phone and skips what's missing);
-- running it backs everything up to the account and lets Boon see it.

-- 1. Daily weigh-ins, calories eaten and sleep (from the app or Apple Health)
alter table public.daily_stats add column if not exists weight numeric;
alter table public.daily_stats add column if not exists kcal integer;
alter table public.daily_stats add column if not exists sleep_min integer;
drop policy if exists "coach reads daily stats" on public.daily_stats;
create policy "coach reads daily stats" on public.daily_stats for select using (public.is_coach());

-- 2. Food log (photo, barcode, label and quick adds)
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  name text not null,
  kcal integer not null default 0,
  protein integer not null default 0,
  carbs integer,
  fat integer,
  source text check (source in ('photo','barcode','label','quick','meal')),
  client_id text,
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_day on public.food_logs (user_id, day desc);
create unique index if not exists food_logs_client on public.food_logs (user_id, client_id);
alter table public.food_logs enable row level security;
drop policy if exists own_rows on public.food_logs;
create policy own_rows on public.food_logs for all
  using (user_id = auth.uid() or public.is_coach()) with check (user_id = auth.uid() or public.is_coach());

-- 3. Photo and label scans get their own daily count, so they never use up chat questions.
alter table public.ai_usage add column if not exists scans integer not null default 0;
create or replace function public.ai_bump_scan(uid uuid, d date) returns int
language sql security definer set search_path = public as $$
  insert into public.ai_usage (user_id, day, questions, scans) values (uid, d, 0, 1)
  on conflict (user_id, day) do update set scans = public.ai_usage.scans + 1
  returning scans;
$$;
revoke all on function public.ai_bump_scan(uuid, date) from public, anon, authenticated;
grant execute on function public.ai_bump_scan(uuid, date) to service_role;

-- 4. Push notifications: the phone's Expo push token (so Boon can nudge a client later)
alter table public.profiles add column if not exists push_token text;

-- 5. Boon's "one thing this week" on each review (shows big on the client's coach home)
alter table public.coach_reviews add column if not exists focus text;

-- 6. Progress photos can be added any day, not only with a check-in
alter table public.photos alter column checkin_id drop not null;

select 'daily results ready' as ok;
