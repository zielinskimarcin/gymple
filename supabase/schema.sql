-- Gymple Supabase application schema snapshot.
-- Use this to understand or bootstrap the backend. Review before applying to an existing database.

do $$
begin
  create type public.premium_plan as enum ('none', 'monthly', 'lifetime');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  avatar_color text default '#ff6b6b',
  first_name text,
  ui_theme text default 'system' check (ui_theme in ('system', 'light', 'dark')),
  ui_language text default 'system' check (ui_language in ('system', 'en', 'pl', 'it')),
  units_weight text default 'kg' check (units_weight in ('kg', 'lb', 'lbs')),
  marketing_opt_in boolean default false,
  crash_reporting boolean default true,
  workouts_per_week integer default 3,
  updated_at timestamptz default now(),
  is_premium boolean not null default false,
  premium_plan public.premium_plan not null default 'none',
  premium_since timestamptz,
  premium_renews_at timestamptz,
  premium_active boolean not null default false,
  weight_unit text,
  main_goal text,
  experience_level text,
  onboarding_done boolean default false,
  has_onboarded boolean default false
);

create table if not exists public.default_exercises (
  id text primary key,
  name text not null,
  muscle_group text not null
);

create table if not exists public.default_templates (
  id text primary key,
  name text not null,
  icon text not null,
  exercise_ids text[] not null default '{}'
);

create table if not exists public.custom_exercises (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null,
  exercise_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  started_at timestamptz not null,
  duration_sec integer not null default 0,
  status text not null check (status in ('finished', 'in_progress', 'canceled')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.template_favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null references public.templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id)
);

create or replace function public.trigger_set_timestamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.update_premium_active()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.premium_plan = 'lifetime' then
    new.premium_active := true;
  elsif new.premium_plan = 'monthly' and new.premium_renews_at is not null and new.premium_renews_at > now() then
    new.premium_active := true;
  else
    new.premium_active := false;
  end if;

  new.is_premium := new.premium_active;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, has_onboarded)
  values (new.id, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists set_timestamp on public.profiles;
create trigger set_timestamp
before update on public.profiles
for each row execute function public.trigger_set_timestamp();

drop trigger if exists trg_profiles_premium_active on public.profiles;
create trigger trg_profiles_premium_active
before insert or update on public.profiles
for each row execute function public.update_premium_active();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.default_exercises enable row level security;
alter table public.default_templates enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.templates enable row level security;
alter table public.workouts enable row level security;
alter table public.template_favourites enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = (select auth.uid()));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists default_exercises_read_authenticated on public.default_exercises;
create policy default_exercises_read_authenticated on public.default_exercises
for select to authenticated
using (true);

drop policy if exists default_templates_read_authenticated on public.default_templates;
create policy default_templates_read_authenticated on public.default_templates
for select to authenticated
using (true);

drop policy if exists custom_exercises_crud_own on public.custom_exercises;
create policy custom_exercises_crud_own on public.custom_exercises
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists templates_crud_own on public.templates;
create policy templates_crud_own on public.templates
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists workouts_crud_own on public.workouts;
create policy workouts_crud_own on public.workouts
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists template_favourites_crud_own on public.template_favourites;
create policy template_favourites_crud_own on public.template_favourites
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create index if not exists idx_custom_exercises_user on public.custom_exercises (user_id, created_at desc);
create unique index if not exists uniq_custom_exercises_user_name on public.custom_exercises (user_id, lower(name));
create index if not exists idx_templates_user on public.templates (user_id, updated_at desc);
create unique index if not exists uniq_templates_user_name on public.templates (user_id, lower(name));
create index if not exists idx_workouts_user on public.workouts (user_id, started_at desc);
create index if not exists idx_template_favourites_template on public.template_favourites (template_id);

insert into public.default_exercises (id, name, muscle_group) values
  ('bench', 'Bench Press', 'Chest'),
  ('incline_db', 'Incline DB Press', 'Chest'),
  ('row', 'Barbell Row', 'Back'),
  ('deadlift', 'Deadlift', 'Back'),
  ('pullup', 'Pull-Up', 'Back'),
  ('squat', 'Back Squat', 'Legs'),
  ('rdl', 'Romanian Deadlift', 'Legs'),
  ('ohp', 'Overhead Press', 'Shoulders'),
  ('curl', 'Barbell Curl', 'Arms'),
  ('pushdown', 'Triceps Pushdown', 'Arms'),
  ('plank', 'Plank', 'Core'),
  ('burpee', 'Burpees', 'Full Body'),
  ('treadmill', 'Treadmill Run', 'Cardio')
on conflict (id) do update set
  name = excluded.name,
  muscle_group = excluded.muscle_group;

insert into public.default_templates (id, name, icon, exercise_ids) values
  ('tpl_push', 'Push', 'flash', array['bench', 'incline_db', 'ohp', 'pushdown']),
  ('tpl_pull', 'Pull', 'body', array['row', 'pullup', 'curl', 'plank']),
  ('tpl_legs', 'Legs', 'barbell', array['squat', 'rdl'])
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon,
  exercise_ids = excluded.exercise_ids;
