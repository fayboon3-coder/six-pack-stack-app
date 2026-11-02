-- Six-Pack Stack app: Ask Boon (version 4)
-- The AI chat. Messages live in chat_messages (already in 001). Daily question
-- counts live here; only the ask-boon server function writes them, so a user
-- can't reset their own limit.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  questions int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
drop policy if exists read_own_usage on public.ai_usage;
create policy read_own_usage on public.ai_usage for select using (user_id = auth.uid() or public.is_coach());

-- Atomic +1 used by the server function (service role).
create or replace function public.ai_bump(uid uuid, d date) returns int
language sql security definer set search_path = public as $$
  insert into public.ai_usage (user_id, day, questions) values (uid, d, 1)
  on conflict (user_id, day) do update set questions = public.ai_usage.questions + 1
  returning questions;
$$;
revoke all on function public.ai_bump(uuid, date) from public, anon, authenticated;

create index if not exists chat_messages_user_time on public.chat_messages (user_id, created_at desc);

-- For the weekly report: questions asked per tier, last 7 days.
create or replace view public.ai_questions_by_tier with (security_invoker = on) as
select p.tier, coalesce(sum(u.questions), 0) as questions, count(distinct u.user_id) as people
from public.ai_usage u join public.profiles p on p.id = u.user_id
where u.day > current_date - 7 group by p.tier;

select 'ask_boon ready' as status;
