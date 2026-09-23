-- =============================================================
-- ORlegit — Complete Supabase PostgreSQL Schema
-- Community-powered, AI-verified scam detection platform
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- =============================================================
-- Custom Enum Types
-- =============================================================
do $$ begin
  create type verdict_type as enum ('LIKELY_SCAM', 'LIKELY_GENUINE', 'UNCERTAIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('PENDING', 'VERIFIED', 'DISPUTED', 'REMOVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_category as enum (
    'phishing', 'fake_product', 'romance_scam',
    'investment_fraud', 'lottery', 'tech_support',
    'impersonation', 'other'
  );
exception when duplicate_object then null; end $$;

-- =============================================================
-- 1. Profiles Table
-- =============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  trust_score int not null default 100 check (trust_score between 0 and 1000),
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- =============================================================
-- 2. Scam Reports Table
-- =============================================================
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  target text not null,
  target_normalized text not null default '',
  category report_category not null,
  evidence_urls text[] not null default '{}',
  ai_verdict verdict_type not null default 'UNCERTAIN',
  ai_confidence int not null default 50 check (ai_confidence between 0 and 100),
  ai_reasoning text not null default '',
  ai_red_flags text[] not null default '{}',
  community_scam_votes int not null default 0,
  community_genuine_votes int not null default 0,
  status report_status not null default 'PENDING',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reports enable row level security;

-- RLS: Public read (except REMOVED handled in queries or view)
create policy "Reports are viewable by everyone"
  on public.reports for select using (true);

-- RLS: Insert policy enforces default AI columns (clients cannot forge verdicts)
create policy "Authenticated users can insert reports"
  on public.reports for insert
  with check (
    auth.uid() is not null
    and ai_verdict = 'UNCERTAIN'
    and ai_confidence = 50
    and ai_reasoning = ''
  );

-- RLS: Users can update their own non-AI fields
create policy "Users can update own reports non-AI fields"
  on public.reports for update
  using (auth.uid() = user_id)
  with check (
    ai_verdict = ai_verdict
    and ai_confidence = ai_confidence
    and ai_reasoning = ai_reasoning
  );

-- RLS: Delete policy for report author or moderators
create policy "Users can delete own reports"
  on public.reports for delete
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('moderator', 'admin')
    )
  );

-- =============================================================
-- 3. Votes Table
-- =============================================================
create table if not exists public.votes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  report_id uuid references public.reports(id) on delete cascade not null,
  vote text not null check (vote in ('scam', 'genuine')),
  created_at timestamptz default now(),
  unique (user_id, report_id)
);

alter table public.votes enable row level security;

create policy "Votes are viewable by everyone"
  on public.votes for select using (true);

create policy "Authenticated users can insert their own vote"
  on public.votes for insert
  with check (auth.uid() = user_id);

create policy "Votes are immutable"
  on public.votes for update using (false);

create policy "Users cannot delete votes"
  on public.votes for delete using (false);

-- =============================================================
-- 4. Comments Table
-- =============================================================
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  report_id uuid references public.reports(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Authenticated users can comment"
  on public.comments for insert
  with check (auth.uid() is not null);

-- =============================================================
-- 5. Moderation Audit Trail Table
-- =============================================================
create table if not exists public.report_moderation_log (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  moderator_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('PUBLISH', 'HIDE', 'DISPUTE', 'REMOVE', 'RESTORE', 'VERIFY')),
  reason text,
  previous_status text,
  new_status text,
  created_at timestamptz default now()
);

alter table public.report_moderation_log enable row level security;

create policy "Moderation log is viewable by everyone"
  on public.report_moderation_log for select using (true);

create policy "Authenticated users can submit disputes"
  on public.report_moderation_log for insert
  with check (
    auth.uid() is not null
    and (
      action = 'DISPUTE'
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role in ('moderator', 'admin')
      )
    )
  );

-- =============================================================
-- 6. Feed Posts & Comments Tables
-- =============================================================
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text not null,
  tags text[] default '{}',
  image_urls text[] default '{}',
  likes int default 0,
  is_verified_report boolean default false,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

create table if not exists public.post_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  likes int default 0,
  created_at timestamptz default now()
);

alter table public.post_comments enable row level security;

create policy "Post comments are viewable by everyone"
  on public.post_comments for select using (true);

create policy "Authenticated users can insert post comments"
  on public.post_comments for insert
  with check (auth.uid() is not null);

-- =============================================================
-- 7. Automated Database Functions & Triggers
-- =============================================================

-- A. Update updated_at timestamp on reports
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_reports_updated_at on public.reports;
create trigger update_reports_updated_at
  before update on public.reports
  for each row execute procedure update_updated_at_column();

-- B. Defense-in-depth trigger protecting AI verdict columns
create or replace function public.fn_protect_ai_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  if current_role <> 'service_role' and current_setting('request.jwt.claim.role', true) <> 'service_role' then
    if (
      new.ai_verdict    is distinct from old.ai_verdict    or
      new.ai_confidence is distinct from old.ai_confidence or
      new.ai_reasoning  is distinct from old.ai_reasoning  or
      new.ai_red_flags  is distinct from old.ai_red_flags
    ) then
      raise exception 'AI verdict columns can only be modified by the server service role.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_ai_columns on public.reports;
create trigger trg_protect_ai_columns
  before update on public.reports
  for each row execute function public.fn_protect_ai_columns();

-- C. Atomic vote counter increment
create or replace function public.fn_update_vote_counts()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.vote = 'scam' then
    update public.reports
    set community_scam_votes = community_scam_votes + 1
    where id = new.report_id;
  elsif new.vote = 'genuine' then
    update public.reports
    set community_genuine_votes = community_genuine_votes + 1
    where id = new.report_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_update_vote_counts on public.votes;
create trigger trg_update_vote_counts
  after insert on public.votes
  for each row execute function public.fn_update_vote_counts();

-- D. Target normalization function and trigger
create or replace function public.fn_normalize_target(raw_target text)
returns text as $$
declare
  normalized text;
begin
  normalized := lower(trim(raw_target));

  if normalized like 'http://%' or normalized like 'https://%' then
    normalized := regexp_replace(normalized, '^https?://', '');
    normalized := regexp_replace(normalized, '^www\.', '');
    normalized := regexp_replace(normalized, '/+$', '');
    normalized := regexp_replace(normalized, '\?.*$', '');
    return normalized;
  end if;

  if normalized ~ '^\+?[0-9\s\-\(\)\.]{6,}$' then
    normalized := regexp_replace(normalized, '[^0-9+]', '', 'g');
    if normalized ~ '^0[6-9][0-9]{9}$' then
      normalized := '+91' || substring(normalized from 2);
    end if;
    if normalized ~ '^[6-9][0-9]{9}$' then
      normalized := '+91' || normalized;
    end if;
    return normalized;
  end if;

  return normalized;
end;
$$ language plpgsql immutable;

create or replace function public.fn_set_normalized_target()
returns trigger as $$
begin
  new.target_normalized := fn_normalize_target(new.target);
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_normalized_target on public.reports;
create trigger set_normalized_target
  before insert or update of target on public.reports
  for each row execute function public.fn_set_normalized_target();

-- E. Trust score resolution on moderation
create or replace function public.fn_resolve_trust_score()
returns trigger
language plpgsql
security definer
as $$
declare
  v_outcome       text;
  v_report_user   uuid;
  v_vote          record;
  v_submitter_adj int;
  v_match_adj     int := 2;
  v_mismatch_adj  int := -5;
begin
  if new.new_status not in ('VERIFIED', 'REMOVED') then
    return new;
  end if;

  if new.new_status = 'VERIFIED' then
    v_outcome       := 'scam';
    v_submitter_adj := 10;
  else
    v_outcome       := 'genuine';
    v_submitter_adj := -20;
  end if;

  select user_id into v_report_user
  from public.reports
  where id = new.report_id;

  if v_report_user is not null then
    update public.profiles
    set trust_score = greatest(0, least(1000, trust_score + v_submitter_adj))
    where id = v_report_user;
  end if;

  for v_vote in
    select user_id, vote from public.votes where report_id = new.report_id
  loop
    if v_vote.vote = v_outcome then
      update public.profiles
      set trust_score = greatest(0, least(1000, trust_score + v_match_adj))
      where id = v_vote.user_id;
    else
      update public.profiles
      set trust_score = greatest(0, least(1000, trust_score + v_mismatch_adj))
      where id = v_vote.user_id;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_resolve_trust_score on public.report_moderation_log;
create trigger trg_resolve_trust_score
  after insert on public.report_moderation_log
  for each row execute function public.fn_resolve_trust_score();

-- =============================================================
-- 8. Performance Indexes
-- =============================================================
create index if not exists idx_reports_target on public.reports (target);
create index if not exists idx_reports_target_normalized on public.reports (target_normalized);
create index if not exists idx_reports_category on public.reports (category);
create index if not exists idx_reports_status on public.reports (status);
create index if not exists idx_reports_created_at on public.reports (created_at desc);

create index if not exists idx_reports_title_trgm on public.reports using gin (title gin_trgm_ops);
create index if not exists idx_reports_target_trgm on public.reports using gin (target gin_trgm_ops);
create index if not exists idx_reports_description_trgm on public.reports using gin (description gin_trgm_ops);
create index if not exists idx_reports_target_normalized_trgm on public.reports using gin (target_normalized gin_trgm_ops);

create index if not exists idx_votes_report_id on public.votes (report_id);
create index if not exists idx_votes_user_id on public.votes (user_id);
create index if not exists idx_modlog_report_id on public.report_moderation_log (report_id);
create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_posts_user_id on public.posts (user_id);
