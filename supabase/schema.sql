-- =============================================
-- ScamShield — Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ---- Profiles ----
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  trust_score int default 0,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- ---- Reports ----
create type verdict_type as enum ('LIKELY_SCAM', 'LIKELY_GENUINE', 'UNCERTAIN');
create type report_status as enum ('PENDING', 'VERIFIED', 'DISPUTED', 'REMOVED');
create type report_category as enum ('phishing', 'fake_product', 'romance_scam', 'investment_fraud', 'lottery', 'tech_support', 'impersonation', 'other');

create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  target text not null,
  category report_category not null,
  evidence_urls text[] default '{}',
  ai_verdict verdict_type default 'UNCERTAIN',
  ai_confidence int default 50,
  ai_reasoning text default '',
  community_scam_votes int default 0,
  community_genuine_votes int default 0,
  status report_status default 'PENDING',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.reports enable row level security;
create policy "Reports are viewable by everyone." on reports for select using (true);
create policy "Anyone can insert reports." on reports for insert with check (true);

-- ---- Votes ----
create table public.votes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  vote text check (vote in ('scam', 'genuine')) not null,
  created_at timestamptz default now(),
  unique(user_id, report_id)
);
alter table public.votes enable row level security;
create policy "Votes are viewable by everyone." on votes for select using (true);
create policy "Anyone can vote." on votes for insert with check (true);

-- ---- Comments ----
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  report_id uuid references public.reports(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
alter table public.comments enable row level security;
create policy "Comments are viewable by everyone." on comments for select using (true);
create policy "Anyone can comment." on comments for insert with check (true);

-- ---- Updated_at trigger ----
create or replace function update_updated_at_column()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger update_reports_updated_at
  before update on reports
  for each row execute procedure update_updated_at_column();

-- ---- Feed Posts ----
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
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
create policy "Posts are viewable by everyone." on posts for select using (true);
create policy "Anyone can insert posts." on posts for insert with check (true);
create policy "Anyone can update posts." on posts for update using (true);

-- ---- Post Comments ----
create table public.post_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  likes int default 0,
  created_at timestamptz default now()
);
alter table public.post_comments enable row level security;
create policy "Post comments are viewable by everyone." on post_comments for select using (true);
create policy "Anyone can insert post comments." on post_comments for insert with check (true);
create policy "Anyone can update post comments." on post_comments for update using (true);

