-- Funnel by video: who came from which link (?src=...) and how far they got.
-- Each person is credited to the FIRST source they arrived with (first touch),
-- matched across the website and the app by the shared anonymous id.
-- Only the coach can run it. Safe to run more than once.

create index if not exists events_anon_idx on public.events (anon_id, created_at);

create or replace function public.funnel_by_source(p_days int default 30)
returns table (src text, step text, people bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  return query
  with ev as (
    select e.anon_id, e.name, e.props, e.created_at
    from public.events e
    where e.created_at > now() - make_interval(days => p_days)
  ),
  first_src as (
    select distinct on (ev.anon_id) ev.anon_id,
           coalesce(nullif(ev.props->>'src', ''), 'direct') as src
    from ev
    where ev.props ? 'src'
    order by ev.anon_id, ev.created_at
  ),
  tagged as (
    select coalesce(f.src, 'direct') as src, ev.anon_id, ev.name
    from ev left join first_src f on f.anon_id = ev.anon_id
  )
  select t.src, t.name as step, count(distinct t.anon_id) as people
  from tagged t
  where t.name in ('ss_visit','ss_preview_tap','ss_start','ss_gate','ss_done','ss_plan_tap',
                   'app_open','quiz_done','plan_ready','paywall_view','purchase_done',
                   'coach_view','coaching_view','apply_view','apply_start','apply_done')
  group by t.src, t.name;
end $$;

revoke all on function public.funnel_by_source(int) from public, anon;
grant execute on function public.funnel_by_source(int) to authenticated;

-- Make sure your own account can read it (change the email if you sign in with another one):
update public.profiles set role = 'coach'
where id in (select id from auth.users where lower(email) = 'bfay@boonfay-pt.com');
