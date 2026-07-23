-- Migration 001: target_normalized column + fn_protect_ai_columns trigger
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
--
-- After running: every new report submitted will have target_normalized computed
-- by the /api/analyze route (server-side, service role).

-- 1. Add target_normalized column to reports (if not already present)
alter table public.reports
  add column if not exists target_normalized text not null default '';

-- 2. Backfill existing rows (strips protocol, www, phone formatting, lowercases)
update public.reports
set target_normalized = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(target, '^https?://', '', 'i'),
      '^www\.', '', 'i'
    ),
    '[\s\-\(\)\.]', '', 'g'
  )
)
where target_normalized = '';

-- 3. Index for exact dedup lookups
create index if not exists idx_reports_target_normalized
  on public.reports (target_normalized);

-- 4. Add ai_red_flags column (if not already present — the schema has it but older instances may not)
alter table public.reports
  add column if not exists ai_red_flags text[] not null default '{}';

-- =============================================================================
-- fn_protect_ai_columns: Rejects any UPDATE to ai_* columns from non-service-role.
--
-- This is defense-in-depth layer 2 (RLS is layer 1). Even if an RLS policy
-- is ever misconfigured, this trigger will prevent AI verdict forgery.
-- =============================================================================

create or replace function public.fn_protect_ai_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Allow only service_role to change ai_* columns
  if current_role <> 'service_role' then
    if (
      new.ai_verdict    is distinct from old.ai_verdict    or
      new.ai_confidence is distinct from old.ai_confidence or
      new.ai_reasoning  is distinct from old.ai_reasoning  or
      new.ai_red_flags  is distinct from old.ai_red_flags
    ) then
      raise exception
        'ai_* columns can only be updated by the service role. '
        'Current role: % — use the /api/analyze server route instead.',
        current_role;
    end if;
  end if;
  return new;
end;
$$;

-- Attach the trigger (drop first in case it already exists with different definition)
drop trigger if exists trg_protect_ai_columns on public.reports;
create trigger trg_protect_ai_columns
  before update on public.reports
  for each row
  execute function public.fn_protect_ai_columns();
