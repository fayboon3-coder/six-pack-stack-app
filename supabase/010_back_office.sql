-- Six-Pack Stack: back office (version 10). Run AFTER 009_daily_results.sql.
-- 1. Each account remembers its Full Stack subscription state (trial, active, cancelled, expired),
--    kept up to date by the subscription function (RevenueCat).
-- 2. A log of every RevenueCat event (trials, renewals, cancellations, refunds) with the price,
--    so the back office can count trials, conversions and revenue.
-- 3. Two coach-only functions the back office reads: back_office() (every headline number)
--    and back_office_people() (every account with its status and last activity).
-- Safe to run more than once.

alter table public.profiles add column if not exists sub_status text;        -- trial | active | cancelled | expired | billing_issue
alter table public.profiles add column if not exists sub_plan text;          -- monthly | yearly
alter table public.profiles add column if not exists sub_expires timestamptz;
alter table public.profiles add column if not exists sub_updated timestamptz;

create table if not exists public.subscription_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null,
  period_type text,
  product_id text,
  price numeric,
  currency text,
  store text,
  is_trial_conversion boolean not null default false,
  event_at timestamptz,
  rc_id text unique
);
create index if not exists subscription_events_created_idx on public.subscription_events (created_at desc);
alter table public.subscription_events enable row level security;
drop policy if exists read_sub_events on public.subscription_events;
create policy read_sub_events on public.subscription_events for select using (public.is_coach());
-- No insert policy: only the subscription function (service role) writes here.

-- Every headline number for the last p_days (and the period before it, for the arrows).
create or replace function public.back_office(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => p_days);
  prev timestamptz := now() - make_interval(days => p_days * 2);
  result jsonb;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;

  select jsonb_build_object(
    'days', p_days,
    'users_total', (select count(*) from profiles where role = 'client'),
    'users_by_tier', coalesce((select jsonb_object_agg(tier, n) from (select tier, count(*) n from profiles where role = 'client' group by tier) t), '{}'::jsonb),
    'new_users', (select count(*) from profiles where role = 'client' and created_at > since),
    'new_users_prev', (select count(*) from profiles where role = 'client' and created_at > prev and created_at <= since),
    'active_1d', (select count(distinct user_id) from events where user_id is not null and created_at > now() - interval '1 day'),
    'active_7d', (select count(distinct user_id) from events where user_id is not null and created_at > now() - interval '7 days'),
    'active_30d', (select count(distinct user_id) from events where user_id is not null and created_at > now() - interval '30 days'),
    'sub_status', coalesce((select jsonb_object_agg(s, n) from (select coalesce(sub_status, 'none') s, count(*) n from profiles
                    where role = 'client' and tier <> 'coached' group by 1) t), '{}'::jsonb),
    'sub_plans', coalesce((select jsonb_object_agg(coalesce(sub_plan, '?'), n) from (select sub_plan, count(*) n from profiles
                    where role = 'client' and tier = 'self' and coalesce(sub_status, 'active') in ('active', 'cancelled', 'billing_issue') group by 1) t), '{}'::jsonb),
    'trials_live', (select count(*) from profiles where role = 'client' and tier = 'self' and sub_status = 'trial'),
    'trials_started', (select count(*) from subscription_events where type = 'INITIAL_PURCHASE' and period_type = 'TRIAL' and created_at > since),
    'trials_started_prev', (select count(*) from subscription_events where type = 'INITIAL_PURCHASE' and period_type = 'TRIAL' and created_at > prev and created_at <= since),
    'paid_direct', (select count(*) from subscription_events where type = 'INITIAL_PURCHASE' and coalesce(period_type, '') <> 'TRIAL' and created_at > since),
    'conversions', (select count(*) from subscription_events where is_trial_conversion and created_at > since),
    'cancellations', (select count(*) from subscription_events where type = 'CANCELLATION' and created_at > since),
    'expirations', (select count(*) from subscription_events where type = 'EXPIRATION' and created_at > since),
    'refunds', (select count(*) from subscription_events where type = 'CANCELLATION' and price < 0 and created_at > since),
    'revenue', (select coalesce(sum(price), 0) from subscription_events
                where type in ('INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE', 'CANCELLATION')
                  and coalesce(period_type, '') <> 'TRIAL' and created_at > since),
    'revenue_prev', (select coalesce(sum(price), 0) from subscription_events
                where type in ('INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE', 'CANCELLATION')
                  and coalesce(period_type, '') <> 'TRIAL' and created_at > prev and created_at <= since),
    'paywall_views', (select count(distinct anon_id) from events where name = 'paywall_view' and created_at > since),
    'purchase_taps', (select count(distinct anon_id) from events where name = 'purchase_tap' and created_at > since),
    'purchases_app', (select count(distinct anon_id) from events where name = 'purchase_done' and created_at > since),
    'ss_visits', (select count(distinct anon_id) from events where name = 'ss_visit' and created_at > since),
    'ss_leads', (select count(distinct anon_id) from events where name = 'ss_done' and created_at > since),
    'ss_leads_prev', (select count(distinct anon_id) from events where name = 'ss_done' and created_at > prev and created_at <= since),
    'quiz_done', (select count(distinct anon_id) from events where name = 'quiz_done' and created_at > since),
    'applications', (select count(distinct anon_id) from events where name = 'apply_done' and created_at > since),
    'applications_prev', (select count(distinct anon_id) from events where name = 'apply_done' and created_at > prev and created_at <= since),
    'coached', (select count(*) from profiles where role = 'client' and tier = 'coached'),
    'reviews_due', (select count(*) from coach_clients where needs_review),
    'checkins', (select count(*) from checkins where created_at > since),
    'checkins_this_week', (select count(*) from checkins where checkin_date >= (current_date - extract(dow from current_date)::int)),
    'workouts', (select count(*) from (select distinct user_id, logged_on from workout_logs where logged_on > since::date) w),
    'weigh_ins', (select count(*) from daily_stats where weight is not null and day > since::date),
    'foods', (select count(*) from food_logs where created_at > since),
    'ai_questions', (select coalesce(sum(questions), 0) from ai_usage where day > since::date),
    'ai_scans', (select coalesce(sum(scans), 0) from ai_usage where day > since::date),
    'invites_waiting', (select count(*) from plan_invites where claimed_at is null),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('d', d::date,
        'signups', (select count(*) from profiles p where p.role = 'client' and p.created_at::date = d::date),
        'active', (select count(distinct e.user_id) from events e where e.user_id is not null and e.created_at::date = d::date),
        'leads', (select count(distinct e.anon_id) from events e where e.name = 'ss_done' and e.created_at::date = d::date),
        'trials', (select count(*) from subscription_events s where s.type = 'INITIAL_PURCHASE' and s.created_at::date = d::date)) order by d)
      from generate_series(current_date - (least(p_days, 90) - 1), current_date, interval '1 day') d), '[]'::jsonb)
  ) into result;
  return result;
end $$;

revoke all on function public.back_office(int) from public, anon;
grant execute on function public.back_office(int) to authenticated;

-- Every account: who they are, what they pay for, how far in, and when they last did something.
create or replace function public.back_office_people()
returns table (
  id uuid, email text, first_name text, tier text, role text, created_at timestamptz, start_date date,
  sub_status text, sub_plan text, sub_expires timestamptz, last_seen timestamptz,
  workouts_30d bigint, checkins bigint, last_checkin date, last_weight numeric, needs_review boolean, goal text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  return query
  select p.id, p.email, p.first_name, p.tier, p.role, p.created_at, p.start_date,
         p.sub_status, p.sub_plan, p.sub_expires,
         (select max(e.created_at) from events e where e.user_id = p.id) as last_seen,
         (select count(*) from (select distinct w.logged_on from workout_logs w where w.user_id = p.id and w.logged_on > current_date - 30) x) as workouts_30d,
         (select count(*) from checkins c where c.user_id = p.id) as checkins,
         (select max(c.checkin_date) from checkins c where c.user_id = p.id) as last_checkin,
         (select c.weight from checkins c where c.user_id = p.id order by c.checkin_date desc limit 1)::numeric as last_weight,
         coalesce((select cc.needs_review from coach_clients cc where cc.id = p.id), false) as needs_review,
         coalesce(p.quiz->>'goal', '') as goal
  from profiles p
  where p.role = 'client'
  order by p.created_at desc;
end $$;

revoke all on function public.back_office_people() from public, anon;
grant execute on function public.back_office_people() to authenticated;

select 'back office ready' as ok;
