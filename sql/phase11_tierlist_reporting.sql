-- Phase 11: Tier List Reporting

-- 1. Modify reports table to reference tier_lists
-- Make comment_id nullable because a report can now be about a tier list OR a comment
ALTER TABLE public.reports ALTER COLUMN comment_id DROP NOT NULL;

-- Add tier_list_id column
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS tier_list_id UUID REFERENCES public.tier_lists(id) ON DELETE CASCADE;

-- Add constraint to ensure a report is about EITHER a comment OR a tier list
ALTER TABLE public.reports ADD CONSTRAINT report_target_check CHECK (
  (comment_id IS NOT NULL AND tier_list_id IS NULL) OR
  (comment_id IS NULL AND tier_list_id IS NOT NULL)
);

-- 2. Update RLS policies (Ensure Admins can delete Tier Lists)
DROP POLICY IF EXISTS "Admins can delete any tier list" ON public.tier_lists;
CREATE POLICY "Admins can delete any tier list"
ON public.tier_lists
FOR DELETE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);
