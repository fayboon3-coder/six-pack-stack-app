-- Six-Pack Stack app: front door (version 3)
-- Free-plan users take the quiz in the app; their answers live on their profile.
alter table public.profiles add column if not exists quiz jsonb;

-- Coach dashboard shows coaching clients only (free and subscription users stay out of Boon's review queue)
create or replace view public.coach_clients with (security_invoker = on) as
select p.id, p.email, p.first_name, p.tier, p.start_date,
       c.week as last_week, c.checkin_date as last_checkin, c.weight as last_weight,
       (select count(*) from public.checkins x where x.user_id = p.id) as checkins,
       (c.id is not null and not exists (
          select 1 from public.coach_reviews r where r.user_id = p.id and r.week = c.week)) as needs_review
from public.profiles p
left join lateral (
  select * from public.checkins k where k.user_id = p.id order by k.checkin_date desc, k.created_at desc limit 1
) c on true
where p.role = 'client' and p.tier = 'coached';

-- App users by tier, for the weekly report
create or replace view public.app_users_by_tier with (security_invoker = on) as
select tier, count(*) as users, count(*) filter (where created_at > now() - interval '7 days') as new_this_week
from public.profiles where role = 'client' group by tier;

select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'quiz';
