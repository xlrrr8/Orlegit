-- =============================================================================
-- Migration 007: Allow users to delete their own scam reports
-- Run this in your Supabase SQL editor
-- =============================================================================

-- Drop existing DELETE policy if any
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
DROP POLICY IF EXISTS "Moderators can delete any report" ON public.reports;

-- Policy 1: Authenticated users can delete reports where user_id matches auth.uid()
CREATE POLICY "Users can delete own reports"
  ON public.reports FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

-- Policy 2: Moderators and admins can delete any report
CREATE POLICY "Moderators can delete any report"
  ON public.reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('moderator', 'admin')
    )
  );
