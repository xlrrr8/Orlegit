-- =============================================================
-- Migration 003: Moderation audit trail
-- Adds a role column to profiles, creates report_moderation_log table,
-- and updates report_status enum.
-- =============================================================

-- Add role column to profiles for moderator identification
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user'
    CHECK (role IN ('user', 'moderator', 'admin'));

-- Create moderation log table
CREATE TABLE IF NOT EXISTS public.report_moderation_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  moderator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text CHECK (action IN ('PUBLISH', 'HIDE', 'DISPUTE', 'REMOVE', 'RESTORE', 'VERIFY')) NOT NULL,
  reason text,
  previous_status report_status,
  new_status report_status,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_moderation_log ENABLE ROW LEVEL SECURITY;

-- Anyone can view moderation logs (transparency)
CREATE POLICY "Moderation logs are viewable by everyone"
  ON report_moderation_log FOR SELECT
  USING (true);

-- Only moderators and admins can insert moderation actions (except DISPUTE)
-- For disputes, any authenticated user can submit
CREATE POLICY "Authenticated users can submit disputes"
  ON report_moderation_log FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      action = 'DISPUTE'
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('moderator', 'admin')
      )
    )
  );

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_moderation_log_report
  ON report_moderation_log(report_id);

CREATE INDEX IF NOT EXISTS idx_moderation_log_moderator
  ON report_moderation_log(moderator_id);

CREATE INDEX IF NOT EXISTS idx_moderation_log_created
  ON report_moderation_log(created_at DESC);
