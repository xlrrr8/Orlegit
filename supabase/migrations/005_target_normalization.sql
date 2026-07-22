-- =============================================================
-- Migration 005: Target normalization for de-duplication/clustering
-- Adds a normalized target column and trigger for automatic normalization.
-- =============================================================

-- Add normalized target column
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_normalized text;

-- Function to normalize targets:
-- - URLs: strip protocol, www, trailing slashes, lowercase
-- - Phone numbers: strip spaces, dashes, parens, normalize +91 prefix
-- - General: lowercase, trim
CREATE OR REPLACE FUNCTION fn_normalize_target(raw_target text)
RETURNS text AS $$
DECLARE
  normalized text;
BEGIN
  normalized := LOWER(TRIM(raw_target));

  -- URL normalization
  IF normalized LIKE 'http://%' OR normalized LIKE 'https://%' THEN
    -- Strip protocol
    normalized := regexp_replace(normalized, '^https?://', '');
    -- Strip www.
    normalized := regexp_replace(normalized, '^www\.', '');
    -- Strip trailing slashes
    normalized := regexp_replace(normalized, '/+$', '');
    -- Strip common query params
    normalized := regexp_replace(normalized, '\?.*$', '');
    RETURN normalized;
  END IF;

  -- Phone number normalization
  -- Remove all non-digit/non-plus characters
  IF normalized ~ '^\+?[0-9\s\-\(\)\.]{6,}$' THEN
    normalized := regexp_replace(normalized, '[^0-9+]', '', 'g');
    -- Normalize Indian numbers: 0XXXXXXXXXX -> +91XXXXXXXXXX
    IF normalized ~ '^0[6-9][0-9]{9}$' THEN
      normalized := '+91' || substring(normalized from 2);
    END IF;
    -- Normalize 10-digit Indian numbers without prefix
    IF normalized ~ '^[6-9][0-9]{9}$' THEN
      normalized := '+91' || normalized;
    END IF;
    RETURN normalized;
  END IF;

  -- General: just lowercase and trim (already done)
  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to auto-populate target_normalized on INSERT/UPDATE
CREATE OR REPLACE FUNCTION fn_set_normalized_target()
RETURNS TRIGGER AS $$
BEGIN
  NEW.target_normalized := fn_normalize_target(NEW.target);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_normalized_target ON reports;
CREATE TRIGGER set_normalized_target
  BEFORE INSERT OR UPDATE OF target ON reports
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_normalized_target();

-- Backfill existing rows
UPDATE reports SET target_normalized = fn_normalize_target(target)
  WHERE target_normalized IS NULL;

-- Index on normalized target for clustering queries
CREATE INDEX IF NOT EXISTS idx_reports_target_normalized
  ON reports(target_normalized);

-- GIN trigram index for fuzzy matching on normalized target
CREATE INDEX IF NOT EXISTS idx_reports_target_normalized_trgm
  ON reports USING gin (target_normalized gin_trgm_ops);
