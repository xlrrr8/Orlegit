-- =============================================================
-- Migration 006: Trust score mechanics
-- Implements dynamic trust_score calculation based on user activity.
-- =============================================================

-- Update default trust_score to 100 (already 0 in schema, fix to 100)
ALTER TABLE public.profiles
  ALTER COLUMN trust_score SET DEFAULT 100;

-- Update existing users with 0 trust_score to 100
UPDATE profiles SET trust_score = 100 WHERE trust_score = 0;

-- Function to recalculate a user's trust score
CREATE OR REPLACE FUNCTION fn_recalculate_trust_score(p_user_id uuid)
RETURNS int AS $$
DECLARE
  v_score int := 100; -- Base score
  v_confirmed_reports int;
  v_hidden_reports int;
  v_aligned_votes int;
  v_opposed_votes int;
BEGIN
  -- +10 for each report that was confirmed (VERIFIED or PUBLISHED status)
  SELECT COUNT(*) INTO v_confirmed_reports
  FROM reports
  WHERE user_id = p_user_id
    AND status IN ('VERIFIED');

  -- -20 for each report that was HIDDEN or REMOVED
  SELECT COUNT(*) INTO v_hidden_reports
  FROM reports
  WHERE user_id = p_user_id
    AND status IN ('REMOVED');

  -- +2 for votes aligned with community consensus
  -- (scam vote on report with > 60% scam votes, or genuine vote on < 40%)
  SELECT COUNT(*) INTO v_aligned_votes
  FROM votes v
  JOIN reports r ON r.id = v.report_id
  WHERE v.user_id = p_user_id
    AND (r.community_scam_votes + r.community_genuine_votes) >= 5  -- Only count reports with enough votes
    AND (
      (v.vote = 'scam' AND r.community_scam_votes::numeric / NULLIF(r.community_scam_votes + r.community_genuine_votes, 0) > 0.6)
      OR
      (v.vote = 'genuine' AND r.community_genuine_votes::numeric / NULLIF(r.community_scam_votes + r.community_genuine_votes, 0) > 0.6)
    );

  -- -5 for votes against consensus
  SELECT COUNT(*) INTO v_opposed_votes
  FROM votes v
  JOIN reports r ON r.id = v.report_id
  WHERE v.user_id = p_user_id
    AND (r.community_scam_votes + r.community_genuine_votes) >= 5
    AND (
      (v.vote = 'scam' AND r.community_genuine_votes::numeric / NULLIF(r.community_scam_votes + r.community_genuine_votes, 0) > 0.6)
      OR
      (v.vote = 'genuine' AND r.community_scam_votes::numeric / NULLIF(r.community_scam_votes + r.community_genuine_votes, 0) > 0.6)
    );

  v_score := 100
    + (v_confirmed_reports * 10)
    - (v_hidden_reports * 20)
    + (v_aligned_votes * 2)
    - (v_opposed_votes * 5);

  -- Floor at 0, cap at 1000
  v_score := GREATEST(0, LEAST(1000, v_score));

  -- Update the profile
  UPDATE profiles SET trust_score = v_score WHERE id = p_user_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: recalculate trust_score when a moderation action occurs
CREATE OR REPLACE FUNCTION fn_trust_score_on_moderation()
RETURNS TRIGGER AS $$
DECLARE
  v_report_author uuid;
BEGIN
  -- Get the report's author
  SELECT user_id INTO v_report_author
  FROM reports
  WHERE id = NEW.report_id;

  -- Recalculate trust score for the report's author
  IF v_report_author IS NOT NULL THEN
    PERFORM fn_recalculate_trust_score(v_report_author);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trust_score_on_moderation ON report_moderation_log;
CREATE TRIGGER trust_score_on_moderation
  AFTER INSERT ON report_moderation_log
  FOR EACH ROW
  EXECUTE FUNCTION fn_trust_score_on_moderation();
