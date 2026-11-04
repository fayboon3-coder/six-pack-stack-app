-- Six-Pack Stack app: daily steps + protein sync and the weekly steps leaderboard (version 4)
-- Run once in Supabase → SQL editor. Safe to run again.

create table if not exists public.daily_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  steps integer not null default 0,
  protein integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.daily_stats enable row level security;
drop policy if exists "own daily stats" on public.daily_stats;
create policy "own daily stats" on public.daily_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nobody is on the leaderboard unless they turn it on in the app.
alter table public.profiles add column if not exists on_leaderboard boolean not null default false;

-- Weekly steps leaderboard: first names and step totals of people who opted in, plus the caller's own rank.
create or replace function public.steps_leaderboard(p_week_start date)
returns table (rank bigint, first_name text, steps bigint, is_me boolean)
language sql security definer set search_path = public as $$
  with totals as (
    select p.id, coalesce(nullif(p.first_name, ''), 'Member') as first_name,
           coalesce(sum(d.steps), 0)::bigint as steps
    from public.profiles p
    left join public.daily_stats d on d.user_id = p.id and d.day >= p_week_start and d.day < p_week_start + 7
    where p.on_leaderboard or p.id = auth.uid()
    group by p.id, p.first_name
  ), ranked as (
    select rank() over (order by steps desc) as rank, first_name, steps, id = auth.uid() as is_me from totals
  )
  select rank, first_name, steps, is_me from ranked where rank <= 10 or is_me order by rank;
$$;
revoke all on function public.steps_leaderboard(date) from public;
grant execute on function public.steps_leaderboard(date) to authenticated;

-- Sunday check-in: "How closely did you follow the plan?" (1-5)
alter table public.checkins add column if not exists adherence smallint;

select 'daily_stats ready' as ok;
