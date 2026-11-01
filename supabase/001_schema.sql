-- Six-Pack Stack app: core schema (version 1)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  role text not null default 'client' check (role in ('client','coach')),
  tier text not null default 'free' check (tier in ('free','self','coached')),
  program text default 'six-pack-stack',
  start_date date,
  created_at timestamptz not null default now()
);

create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date,
  day_label text,
  exercise_id text not null,
  set_no int not null,
  weight numeric,
  reps int,
  created_at timestamptz not null default now()
);
create index if not exists workout_logs_user_ex on public.workout_logs (user_id, exercise_id, logged_on desc);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week int not null,
  checkin_date date not null default current_date,
  weight numeric, waist numeric, steps int,
  workouts int, nutrition_days int, protein_days int,
  energy int, hunger int, sleep numeric,
  stronger text, win text, hardest text, questions text,
  share_win boolean default false, share_photos boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_id uuid references public.checkins(id) on delete set null,
  angle text check (angle in ('front','side','back')),
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week int,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Row level security: clients see only their own rows; the coach sees everything
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.workout_logs enable row level security;
alter table public.checkins enable row level security;
alter table public.photos enable row level security;
alter table public.coach_reviews enable row level security;
alter table public.chat_messages enable row level security;

do $$ declare t text; begin
  foreach t in array array['plans','workout_logs','checkins','photos','chat_messages'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all using (user_id = auth.uid() or public.is_coach()) with check (user_id = auth.uid() or public.is_coach())', t);
  end loop;
end $$;

drop policy if exists own_profile on public.profiles;
create policy own_profile on public.profiles for select using (id = auth.uid() or public.is_coach());
drop policy if exists update_own_profile on public.profiles;
create policy update_own_profile on public.profiles for update using (id = auth.uid() or public.is_coach())
  with check (public.is_coach() or id = auth.uid());

-- Clients can edit their own name, never their role or tier
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_coach()
     and (new.role is distinct from old.role or new.tier is distinct from old.tier) then
    raise exception 'role and tier can only be changed by the coach';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles
  for each row execute function public.guard_profile();

drop policy if exists read_reviews on public.coach_reviews;
create policy read_reviews on public.coach_reviews for select using (user_id = auth.uid() or public.is_coach());
drop policy if exists write_reviews on public.coach_reviews;
create policy write_reviews on public.coach_reviews for all using (public.is_coach()) with check (public.is_coach());

-- New sign-ups get a profile automatically
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Private bucket for progress photos (each user's folder is their user id)
insert into storage.buckets (id, name, public) values ('progress-photos','progress-photos', false)
  on conflict (id) do nothing;
drop policy if exists photos_own on storage.objects;
create policy photos_own on storage.objects for all
  using (bucket_id = 'progress-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()))
  with check (bucket_id = 'progress-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
