-- Migration 002: votes table + vote count trigger + trust score trigger
-- Run this in your Supabase SQL editor AFTER migration 001.

-- =============================================================================
-- votes table
-- =============================================================================
create table if not exists public.votes (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  report_id   uuid references public.reports(id)  on delete cascade not null,
  vote        text not null check (vote in ('scam', 'genuine')),
  created_at  timestamptz default now(),
  unique (user_id, report_id)  -- one vote per user per report, immutable after insert
);

-- RLS: authenticated users can read all votes; insert their own (once); no update/delete
alter table public.votes enable row level security;

create policy "Anyone can read votes"
  on public.votes for select using (true);

create policy "Authenticated users can insert their own vote"
  on public.votes for insert
  with check (auth.uid() = user_id);

-- No UPDATE policy — votes are immutable once cast (enforced by RLS + unique constraint)

-- Index for fast report vote lookups
create index if not exists idx_votes_report_id on public.votes (report_id);
create index if not exists idx_votes_user_id   on public.votes (user_id);

-- =============================================================================
-- fn_update_vote_counts: Increments scam/genuine counters atomically on INSERT.
--
-- This replaces any client-driven "insert vote then separately update counter"
-- pattern. Counters are trigger-derived, never maintained by two round-trips.
-- =============================================================================
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
  for each row
  execute function public.fn_update_vote_counts();

-- =============================================================================
-- fn_resolve_trust_score: Fires on report_moderation_log INSERT when a report
-- transitions to VERIFIED or REMOVED. Adjusts voter trust scores retroactively
-- against the RESOLVED outcome — not against the live tally.
--
-- This is critical: scoring against real-time consensus would punish early,
-- correct whistleblowers before the crowd catches up.
--
-- Adjustments (all clamped to [0, 1000]):
--   Report submitter: +10 if VERIFIED, -20 if REMOVED
--   Matching voter:   +2  (vote matched outcome)
--   Mismatched voter: -5  (vote did not match outcome)
-- =============================================================================
create or replace function public.fn_resolve_trust_score()
returns trigger
language plpgsql
security definer
as $$
declare
  v_outcome       text;  -- 'scam' or 'genuine' derived from new_status
  v_report_user   uuid;
  v_vote          record;
  v_submitter_adj int;
  v_match_adj     int;
  v_mismatch_adj  int;
begin
  -- Only trigger on VERIFIED or REMOVED transitions
  if new.new_status not in ('VERIFIED', 'REMOVED') then
    return new;
  end if;

  -- Derive the canonical outcome for vote-matching
  if new.new_status = 'VERIFIED' then
    v_outcome      := 'scam';
    v_submitter_adj := 10;
  else -- REMOVED
    v_outcome      := 'genuine';  -- removed = not actually a scam
    v_submitter_adj := -20;
  end if;

  v_match_adj    := 2;
  v_mismatch_adj := -5;

  -- Adjust the report submitter's trust score
  select user_id into v_report_user
  from public.reports
  where id = new.report_id;

  if v_report_user is not null then
    update public.profiles
    set trust_score = greatest(0, least(1000, trust_score + v_submitter_adj))
    where id = v_report_user;
  end if;

  -- Adjust every voter's trust score based on whether their vote matched
  for v_vote in
    select user_id, vote
    from public.votes
    where report_id = new.report_id
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
  for each row
  execute function public.fn_resolve_trust_score();
