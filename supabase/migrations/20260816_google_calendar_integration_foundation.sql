-- Google Calendar integration foundation
-- Note: OAuth access/refresh tokens should be stored only in secure server-side storage
-- (e.g. Vault/private schema/Edge Function secret manager), not in user-readable tables.

create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  google_subject text,
  google_email text,
  scope text,
  is_active boolean not null default true,
  selected_calendar_id text,
  selected_calendar_name text,
  sync_cursor text,
  oauth_connected_at timestamptz,
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, provider)
);

create table if not exists public.google_calendar_events_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.google_calendar_connections(id) on delete cascade,
  google_event_id text not null,
  google_calendar_id text not null,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_all_day boolean not null default false,
  status text,
  payload jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, google_calendar_id, google_event_id)
);

create index if not exists idx_google_calendar_connections_user
  on public.google_calendar_connections(user_id);

create index if not exists idx_google_calendar_events_cache_user_starts_at
  on public.google_calendar_events_cache(user_id, starts_at);

create index if not exists idx_google_calendar_events_cache_connection
  on public.google_calendar_events_cache(connection_id);

drop trigger if exists google_calendar_connections_touch_updated_at on public.google_calendar_connections;
create trigger google_calendar_connections_touch_updated_at
before update on public.google_calendar_connections
for each row execute function public.touch_updated_at();

drop trigger if exists google_calendar_events_cache_touch_updated_at on public.google_calendar_events_cache;
create trigger google_calendar_events_cache_touch_updated_at
before update on public.google_calendar_events_cache
for each row execute function public.touch_updated_at();

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_events_cache enable row level security;

drop policy if exists "google_calendar_connections_select_own" on public.google_calendar_connections;
create policy "google_calendar_connections_select_own"
on public.google_calendar_connections for select
using (user_id = auth.uid());

drop policy if exists "google_calendar_connections_insert_own" on public.google_calendar_connections;
create policy "google_calendar_connections_insert_own"
on public.google_calendar_connections for insert
with check (user_id = auth.uid());

drop policy if exists "google_calendar_connections_update_own" on public.google_calendar_connections;
create policy "google_calendar_connections_update_own"
on public.google_calendar_connections for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "google_calendar_connections_delete_own" on public.google_calendar_connections;
create policy "google_calendar_connections_delete_own"
on public.google_calendar_connections for delete
using (user_id = auth.uid());

drop policy if exists "google_calendar_events_cache_select_own" on public.google_calendar_events_cache;
create policy "google_calendar_events_cache_select_own"
on public.google_calendar_events_cache for select
using (user_id = auth.uid());

drop policy if exists "google_calendar_events_cache_insert_own" on public.google_calendar_events_cache;
create policy "google_calendar_events_cache_insert_own"
on public.google_calendar_events_cache for insert
with check (user_id = auth.uid());

drop policy if exists "google_calendar_events_cache_update_own" on public.google_calendar_events_cache;
create policy "google_calendar_events_cache_update_own"
on public.google_calendar_events_cache for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "google_calendar_events_cache_delete_own" on public.google_calendar_events_cache;
create policy "google_calendar_events_cache_delete_own"
on public.google_calendar_events_cache for delete
using (user_id = auth.uid());
