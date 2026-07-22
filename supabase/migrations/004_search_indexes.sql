-- =============================================================
-- Migration 004: Search indexes
-- Adds btree and trigram indexes for efficient text search.
-- =============================================================

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Basic btree index on target for exact/prefix lookups
CREATE INDEX IF NOT EXISTS idx_reports_target
  ON reports(target);

-- GIN trigram indexes for fuzzy substring matching
CREATE INDEX IF NOT EXISTS idx_reports_title_trgm
  ON reports USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_reports_target_trgm
  ON reports USING gin (target gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_reports_description_trgm
  ON reports USING gin (description gin_trgm_ops);

-- Index on category for filtered queries
CREATE INDEX IF NOT EXISTS idx_reports_category
  ON reports(category);

-- Index on created_at for sorting (covers the common "newest first" query)
CREATE INDEX IF NOT EXISTS idx_reports_created_at
  ON reports(created_at DESC);

-- Index on status for filtered queries
CREATE INDEX IF NOT EXISTS idx_reports_status
  ON reports(status);
