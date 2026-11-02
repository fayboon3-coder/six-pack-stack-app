-- Funnel events: where people drop off between opening the app and paying.
-- Anyone can add an event (signed in or not); only the coach can read them.

create table if not exists public.events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  anon_id text not null,
  name text not null check (char_length(name) <= 40),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) < 2000),
  platform text
);
create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists events_name_idx on public.events (name, created_at desc);

alter table public.events enable row level security;

drop policy if exists add_event on public.events;
create policy add_event on public.events for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists read_events on public.events;
create policy read_events on public.events for select using (public.is_coach());

-- Last 7 days, one row per step, counted by unique visitor.
create or replace view public.funnel_7d with (security_invoker = on) as
with e as (
  select name, anon_id from public.events where created_at > now() - interval '7 days'
)
select step, label, (select count(distinct anon_id) from e where e.name = step) as people
from (values
  (1, 'app_open', 'Opened the app'),
  (2, 'quiz_start', 'Started the quiz'),
  (3, 'quiz_foods', 'Reached the food step'),
  (4, 'quiz_done', 'Finished the quiz'),
  (5, 'plan_ready', 'Saw their plan'),
  (6, 'paywall_view', 'Saw The Full Stack offer'),
  (7, 'purchase_tap', 'Tapped start trial / subscribe'),
  (8, 'purchase_done', 'Started a trial or subscription'),
  (9, 'checkin_done', 'Did a Sunday check-in')
) as s(n, step, label)
order by n;
