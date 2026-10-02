-- Enable extension used for UUID generation
create extension if not exists pgcrypto;

-- Public profile linked to Supabase auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.custom_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  name text not null,
  element_id text not null,
  color text,
  parent_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.custom_subareas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  area_id text not null,
  name text not null,
  element_id text not null,
  color text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  title text not null,
  status text not null default 'active',
  element_id text,
  area_primary_id text,
  due_date timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  name text not null,
  element_id text,
  area_id text,
  recurrence_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  title text not null,
  status text not null default 'active',
  element_id text,
  area_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  title text not null,
  status text not null default 'active',
  element_id text,
  area_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.cycle_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  name text not null,
  is_active boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.sequence_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  sequence_local_id text,
  habit_local_id text,
  position integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Keep updated_at current on mutations
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists custom_areas_touch_updated_at on public.custom_areas;
create trigger custom_areas_touch_updated_at before update on public.custom_areas
for each row execute function public.touch_updated_at();

drop trigger if exists custom_subareas_touch_updated_at on public.custom_subareas;
create trigger custom_subareas_touch_updated_at before update on public.custom_subareas
for each row execute function public.touch_updated_at();

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at before update on public.tasks
for each row execute function public.touch_updated_at();

drop trigger if exists habits_touch_updated_at on public.habits;
create trigger habits_touch_updated_at before update on public.habits
for each row execute function public.touch_updated_at();

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists quests_touch_updated_at on public.quests;
create trigger quests_touch_updated_at before update on public.quests
for each row execute function public.touch_updated_at();

drop trigger if exists drafts_touch_updated_at on public.drafts;
create trigger drafts_touch_updated_at before update on public.drafts
for each row execute function public.touch_updated_at();

drop trigger if exists cycle_sequences_touch_updated_at on public.cycle_sequences;
create trigger cycle_sequences_touch_updated_at before update on public.cycle_sequences
for each row execute function public.touch_updated_at();

drop trigger if exists sequence_memberships_touch_updated_at on public.sequence_memberships;
create trigger sequence_memberships_touch_updated_at before update on public.sequence_memberships
for each row execute function public.touch_updated_at();

-- Enable row-level security
alter table public.profiles enable row level security;
alter table public.custom_areas enable row level security;
alter table public.custom_subareas enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.projects enable row level security;
alter table public.quests enable row level security;
alter table public.drafts enable row level security;
alter table public.cycle_sequences enable row level security;
alter table public.sequence_memberships enable row level security;

-- Profiles policy is based on profile id = auth uid
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles for delete
using (id = auth.uid());

-- Shared policy template for user-owned tables
drop policy if exists "custom_areas_select_own" on public.custom_areas;
create policy "custom_areas_select_own"
on public.custom_areas for select
using (user_id = auth.uid());

drop policy if exists "custom_areas_insert_own" on public.custom_areas;
create policy "custom_areas_insert_own"
on public.custom_areas for insert
with check (user_id = auth.uid());

drop policy if exists "custom_areas_update_own" on public.custom_areas;
create policy "custom_areas_update_own"
on public.custom_areas for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "custom_areas_delete_own" on public.custom_areas;
create policy "custom_areas_delete_own"
on public.custom_areas for delete
using (user_id = auth.uid());

drop policy if exists "custom_subareas_select_own" on public.custom_subareas;
create policy "custom_subareas_select_own"
on public.custom_subareas for select
using (user_id = auth.uid());

drop policy if exists "custom_subareas_insert_own" on public.custom_subareas;
create policy "custom_subareas_insert_own"
on public.custom_subareas for insert
with check (user_id = auth.uid());

drop policy if exists "custom_subareas_update_own" on public.custom_subareas;
create policy "custom_subareas_update_own"
on public.custom_subareas for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "custom_subareas_delete_own" on public.custom_subareas;
create policy "custom_subareas_delete_own"
on public.custom_subareas for delete
using (user_id = auth.uid());

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
on public.tasks for select
using (user_id = auth.uid());

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
on public.tasks for insert
with check (user_id = auth.uid());

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
on public.tasks for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
on public.tasks for delete
using (user_id = auth.uid());

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own"
on public.habits for select
using (user_id = auth.uid());

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own"
on public.habits for insert
with check (user_id = auth.uid());

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own"
on public.habits for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own"
on public.habits for delete
using (user_id = auth.uid());

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
on public.projects for select
using (user_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects for insert
with check (user_id = auth.uid());

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
on public.projects for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
on public.projects for delete
using (user_id = auth.uid());

drop policy if exists "quests_select_own" on public.quests;
create policy "quests_select_own"
on public.quests for select
using (user_id = auth.uid());

drop policy if exists "quests_insert_own" on public.quests;
create policy "quests_insert_own"
on public.quests for insert
with check (user_id = auth.uid());

drop policy if exists "quests_update_own" on public.quests;
create policy "quests_update_own"
on public.quests for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "quests_delete_own" on public.quests;
create policy "quests_delete_own"
on public.quests for delete
using (user_id = auth.uid());

drop policy if exists "drafts_select_own" on public.drafts;
create policy "drafts_select_own"
on public.drafts for select
using (user_id = auth.uid());

drop policy if exists "drafts_insert_own" on public.drafts;
create policy "drafts_insert_own"
on public.drafts for insert
with check (user_id = auth.uid());

drop policy if exists "drafts_update_own" on public.drafts;
create policy "drafts_update_own"
on public.drafts for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "drafts_delete_own" on public.drafts;
create policy "drafts_delete_own"
on public.drafts for delete
using (user_id = auth.uid());

drop policy if exists "cycle_sequences_select_own" on public.cycle_sequences;
create policy "cycle_sequences_select_own"
on public.cycle_sequences for select
using (user_id = auth.uid());

drop policy if exists "cycle_sequences_insert_own" on public.cycle_sequences;
create policy "cycle_sequences_insert_own"
on public.cycle_sequences for insert
with check (user_id = auth.uid());

drop policy if exists "cycle_sequences_update_own" on public.cycle_sequences;
create policy "cycle_sequences_update_own"
on public.cycle_sequences for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "cycle_sequences_delete_own" on public.cycle_sequences;
create policy "cycle_sequences_delete_own"
on public.cycle_sequences for delete
using (user_id = auth.uid());

drop policy if exists "sequence_memberships_select_own" on public.sequence_memberships;
create policy "sequence_memberships_select_own"
on public.sequence_memberships for select
using (user_id = auth.uid());

drop policy if exists "sequence_memberships_insert_own" on public.sequence_memberships;
create policy "sequence_memberships_insert_own"
on public.sequence_memberships for insert
with check (user_id = auth.uid());

drop policy if exists "sequence_memberships_update_own" on public.sequence_memberships;
create policy "sequence_memberships_update_own"
on public.sequence_memberships for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "sequence_memberships_delete_own" on public.sequence_memberships;
create policy "sequence_memberships_delete_own"
on public.sequence_memberships for delete
using (user_id = auth.uid());

-- Performance indexes for common user scoped queries
create index if not exists idx_custom_areas_user_id on public.custom_areas(user_id);
create index if not exists idx_custom_subareas_user_id on public.custom_subareas(user_id);
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_habits_user_id on public.habits(user_id);
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_quests_user_id on public.quests(user_id);
create index if not exists idx_drafts_user_id on public.drafts(user_id);
create index if not exists idx_cycle_sequences_user_id on public.cycle_sequences(user_id);
create index if not exists idx_sequence_memberships_user_id on public.sequence_memberships(user_id);
