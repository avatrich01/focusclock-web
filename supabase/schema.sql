-- FocusClock — Supabase schema.
-- Run this once in the Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- Every table is scoped to the signed-in user via Row Level Security, so the
-- public anon key is safe to ship to the browser.

-- ─────────────────────────── settings (one row / user) ───────────────────────
create table if not exists public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  onboarded boolean not null default false,
  user_name text not null default '',
  work_start int not null default 480,
  work_end int not null default 1020,
  lunch_start int not null default 720,
  lunch_end int not null default 780,
  clock_format text not null default '12h',
  theme text not null default 'system',
  notifications_enabled boolean not null default true,
  sound text not null default 'chime',
  volume real not null default 0.7,
  daily_focus_goal int not null default 360,
  carry_over_todos boolean not null default true,
  idle_auto_pause boolean not null default true,
  idle_threshold_minutes int not null default 5,
  notification_extra_seconds int not null default 10,
  lock_past_blocks boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────── hourly blocks ──────────────────────────────────
create table if not exists public.hourly_blocks (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day text not null,
  start_minutes int not null,
  kind text not null default 'work',
  label text not null default '',
  status text not null default 'pending',
  note text not null default '',
  acknowledged_at bigint,
  unique (user_id, day, start_minutes)
);
create index if not exists idx_blocks_user_day on public.hourly_blocks (user_id, day);

-- ─────────────────────────── work sessions ──────────────────────────────────
create table if not exists public.work_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day text not null,
  started_at bigint not null,
  ended_at bigint,
  state text not null default 'running',
  focus_ms bigint not null default 0,
  pause_ms bigint not null default 0,
  pause_started_at bigint,
  last_tick_at bigint not null
);
create index if not exists idx_sessions_user_day on public.work_sessions (user_id, day);

-- ─────────────────────────── daily stats ────────────────────────────────────
create table if not exists public.daily_stats (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day text not null,
  worked_ms bigint not null default 0,
  focus_ms bigint not null default 0,
  break_ms bigint not null default 0,
  blocks_completed int not null default 0,
  blocks_total int not null default 0,
  goal_met boolean not null default false,
  primary key (user_id, day)
);

-- ─────────────────────────── notifications ──────────────────────────────────
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fired_at bigint not null,
  type text not null,
  title text not null,
  body text not null
);
create index if not exists idx_notifications_user_fired on public.notifications (user_id, fired_at);

-- ─────────────────────────── todos ──────────────────────────────────────────
create table if not exists public.todos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  scope text not null default 'daily',
  bucket text not null,
  done boolean not null default false,
  created_at bigint not null,
  completed_at bigint,
  position int not null default 0,
  reminder_minutes int,
  reminder_fired boolean not null default false
);
create index if not exists idx_todos_user_scope_bucket on public.todos (user_id, scope, bucket);

-- ─────────────────────────── push subscriptions ─────────────────────────────
-- Web Push endpoints so the cron job can notify users while their tab is closed.
-- `tz` is the IANA timezone captured in the browser so the server can compute
-- each user's local hour.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tz text not null default 'UTC',
  created_at timestamptz not null default now()
);
create index if not exists idx_push_user on public.push_subscriptions (user_id);

-- ─────────────────────────── Row Level Security ─────────────────────────────
alter table public.settings enable row level security;
alter table public.hourly_blocks enable row level security;
alter table public.work_sessions enable row level security;
alter table public.daily_stats enable row level security;
alter table public.notifications enable row level security;
alter table public.todos enable row level security;
alter table public.push_subscriptions enable row level security;

-- Helper: create the four CRUD policies for a table in one go.
do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'hourly_blocks', 'work_sessions', 'daily_stats', 'notifications', 'todos',
    'push_subscriptions'
  ]
  loop
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_insert" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);
    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
