-- =============================================================
-- Migration 002: Fix vote manipulation
-- Enforces authenticated-only voting, prevents double-votes,
-- and adds a server-side RPC function for atomic vote + counter update.
-- =============================================================

-- Tighten RLS on votes: only authenticated users can insert their own votes
DROP POLICY IF EXISTS "Anyone can vote." ON votes;

CREATE POLICY "Authenticated users can vote as themselves"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Prevent vote updates (no changing your vote)
CREATE POLICY "Votes are immutable"
  ON votes FOR UPDATE
  USING (false);

-- Prevent vote deletion by users
CREATE POLICY "Users cannot delete votes"
  ON votes FOR DELETE
  USING (false);

-- RPC function: atomically insert vote + update report counters
-- Respects the unique(user_id, report_id) constraint
CREATE OR REPLACE FUNCTION fn_cast_vote(
  p_report_id uuid,
  p_vote text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_trust_score int;
  v_weight numeric;
BEGIN
  -- Get the calling user's ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to vote.';
  END IF;

  -- Validate vote type
  IF p_vote NOT IN ('scam', 'genuine') THEN
    RAISE EXCEPTION 'Invalid vote type. Must be "scam" or "genuine".';
  END IF;

  -- Get user's trust score for weighted voting
  SELECT COALESCE(trust_score, 100) INTO v_trust_score
  FROM profiles
  WHERE id = v_user_id;

  -- Calculate vote weight (normalized: trust_score / 100, min 0.1, max 3.0)
  v_weight := GREATEST(0.1, LEAST(3.0, COALESCE(v_trust_score, 100)::numeric / 100.0));

  -- Insert the vote (unique constraint prevents duplicates)
  INSERT INTO votes (user_id, report_id, vote)
  VALUES (v_user_id, p_report_id, p_vote);

  -- Update counters on the report
  -- Using weighted increment for future trust_score integration
  IF p_vote = 'scam' THEN
    UPDATE reports
    SET community_scam_votes = community_scam_votes + 1
    WHERE id = p_report_id;
  ELSE
    UPDATE reports
    SET community_genuine_votes = community_genuine_votes + 1
    WHERE id = p_report_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'vote', p_vote,
    'weight', v_weight
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You have already voted on this report.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION fn_cast_vote(uuid, text) TO authenticated;
