-- Migration 003: report_moderation_log table + posts table + RLS policies
-- Run this in your Supabase SQL editor AFTER migration 002.

-- =============================================================================
-- report_moderation_log table
-- =============================================================================
create table if not exists public.report_moderation_log (
  id              uuid default gen_random_uuid() primary key,
  report_id       uuid references public.reports(id) on delete cascade not null,
  moderator_id    uuid references public.profiles(id),
  action          text not null check (action in ('PUBLISH','HIDE','DISPUTE','REMOVE','RESTORE','VERIFY')),
  reason          text,
  previous_status text,
  new_status      text,
  created_at      timestamptz default now()
);

alter table public.report_moderation_log enable row level security;

-- Anyone can read the moderation log (transparency)
create policy "Anyone can read moderation log"
  on public.report_moderation_log for select using (true);

-- Authenticated users can only insert DISPUTE actions
create policy "Authenticated users can dispute"
  on public.report_moderation_log for insert
  with check (
    auth.uid() is not null and
    action = 'DISPUTE'
  );

-- Service role can do everything (for /api/moderate route)
create policy "Service role full access to moderation log"
  on public.report_moderation_log for all
  using (auth.role() = 'service_role');

-- Index for fast lookups by report
create index if not exists idx_modlog_report_id on public.report_moderation_log (report_id);
create index if not exists idx_modlog_created_at on public.report_moderation_log (created_at desc);

-- =============================================================================
-- posts table (community feed)
-- =============================================================================
create table if not exists public.posts (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references public.profiles(id) on delete cascade not null,
  title              text not null,
  content            text not null,
  category           text not null,
  tags               text[] default '{}',
  likes              int default 0,
  is_verified_report boolean default false,
  created_at         timestamptz default now()
);

alter table public.posts enable row level security;

-- Anyone can read posts
create policy "Anyone can read posts"
  on public.posts for select using (true);

-- Authenticated users can create posts
create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

-- Users can update their own posts
create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id);

-- Users can delete their own posts
create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- Index for feed ordering
create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_posts_user_id    on public.posts (user_id);

-- =============================================================================
-- Add 'role' column to profiles if missing (some older instances may lack it)
-- =============================================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles
      add column role text not null default 'user'
        check (role in ('user', 'moderator', 'admin'));
  end if;
end $$;

-- =============================================================================
-- Make yourself a moderator (replace with your actual user UUID)
-- Uncomment and run separately after getting your user ID from:
--   select id from auth.users where email = 'your@email.com';
-- =============================================================================
-- update public.profiles set role = 'moderator' where id = 'YOUR-USER-UUID-HERE';
