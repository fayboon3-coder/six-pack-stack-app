-- Six-Pack Stack app: client delivery (version 2)
-- 1) Boon's plan task calls assign_plan(email, plan json). If the client already has an app account the
--    plan goes live at once; if not, it waits in plan_invites and is attached the moment they sign up.
-- 2) A coach-only view of every client with their latest check-in and whether it has been reviewed.

create table if not exists public.plan_invites (
  email text primary key,
  data jsonb not null,
  first_name text,
  tier text not null default 'coached' check (tier in ('free','self','coached')),
  start_date date,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
alter table public.plan_invites enable row level security;
drop policy if exists coach_invites on public.plan_invites;
create policy coach_invites on public.plan_invites for all using (public.is_coach()) with check (public.is_coach());

-- Put a plan on a user right now (deactivates their old plan)
create or replace function public.apply_plan(p_user uuid, p_data jsonb, p_first_name text, p_tier text, p_start date)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.plans set active = false where user_id = p_user and active;
  insert into public.plans (user_id, data, active) values (p_user, p_data, true);
  update public.profiles
     set tier = coalesce(p_tier, tier),
         first_name = coalesce(nullif(p_first_name, ''), first_name),
         start_date = coalesce(p_start, start_date)
   where id = p_user;
end $$;

-- Called from the SQL editor (auth.uid() is null) or by the coach in the app
create or replace function public.assign_plan(p_email text, p_data jsonb, p_first_name text default null,
  p_tier text default 'coached', p_start date default null)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid; e text := lower(trim(p_email));
begin
  if auth.uid() is not null and not public.is_coach() then
    raise exception 'only the coach can assign plans';
  end if;
  select id into uid from auth.users where lower(email) = e limit 1;
  if uid is not null then
    perform public.apply_plan(uid, p_data, p_first_name, p_tier, p_start);
    update public.plan_invites set claimed_at = now() where email = e;
    return 'live: plan is in their app now';
  end if;
  insert into public.plan_invites (email, data, first_name, tier, start_date)
    values (e, p_data, p_first_name, p_tier, p_start)
  on conflict (email) do update set data = excluded.data, first_name = excluded.first_name,
    tier = excluded.tier, start_date = excluded.start_date, created_at = now(), claimed_at = null;
  return 'waiting: plan attaches when they create their account with this email';
end $$;
revoke all on function public.assign_plan(text, jsonb, text, text, date) from public, anon;
grant execute on function public.assign_plan(text, jsonb, text, text, date) to authenticated;
revoke all on function public.apply_plan(uuid, jsonb, text, text, date) from public, anon, authenticated;

-- New sign-ups get a profile, and any plan waiting for their email
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv public.plan_invites;
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  select * into inv from public.plan_invites where email = lower(new.email) and claimed_at is null;
  if found then
    perform public.apply_plan(new.id, inv.data, inv.first_name, inv.tier, inv.start_date);
    update public.plan_invites set claimed_at = now() where email = inv.email;
  end if;
  return new;
end $$;

-- Coach dashboard: one row per client (security_invoker keeps row-level security on)
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
where p.role = 'client';

-- Coach can read client photos through signed links (storage policy already allows is_coach())
