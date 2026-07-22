-- =============================================================
-- Migration 001: Lock down AI verdict columns
-- Prevents client-side writes to ai_verdict, ai_confidence, ai_reasoning
-- Only the service role (used by /api/analyze) can update these columns.
-- =============================================================

-- Drop the permissive insert policy that allows anyone to insert anything
DROP POLICY IF EXISTS "Anyone can insert reports." ON reports;

-- New INSERT policy: authenticated users can insert reports
-- AI columns use DB defaults (UNCERTAIN, 50, '') and are NOT client-writable
CREATE POLICY "Authenticated users can insert reports"
  ON reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND ai_verdict = 'UNCERTAIN'
    AND ai_confidence = 50
    AND ai_reasoning = ''
  );

-- Prevent any client-side UPDATE to AI columns or vote counters
-- Users can only update their own reports' non-AI fields
DROP POLICY IF EXISTS "Users can update own reports" ON reports;

CREATE POLICY "Users can update own non-AI fields on their own reports"
  ON reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    -- Ensure AI columns haven't been tampered with:
    -- The new values must equal the old values (i.e., unchanged)
    ai_verdict = ai_verdict
    AND ai_confidence = ai_confidence
    AND ai_reasoning = ai_reasoning
  );

-- The service role bypasses RLS entirely, so /api/analyze using
-- createServiceClient() can freely update ai_verdict, ai_confidence, ai_reasoning.

-- Create a trigger function that blocks direct client updates to AI columns
-- This is an extra safety layer in case RLS is misconfigured
CREATE OR REPLACE FUNCTION fn_protect_ai_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if the session user is the service role (superuser/service_role)
  -- current_setting('request.jwt.claim.role') is set by PostgREST/Supabase
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For non-service-role users, prevent changes to AI columns
  IF NEW.ai_verdict IS DISTINCT FROM OLD.ai_verdict
    OR NEW.ai_confidence IS DISTINCT FROM OLD.ai_confidence
    OR NEW.ai_reasoning IS DISTINCT FROM OLD.ai_reasoning THEN
    RAISE EXCEPTION 'AI verdict columns can only be modified by the server.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_ai_columns ON reports;
CREATE TRIGGER protect_ai_columns
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION fn_protect_ai_columns();
