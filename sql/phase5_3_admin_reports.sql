-- Phase 5.3: Admin Reports & Moderation

-- 1. RLS for Reports (Admin Access)
-- Allow admins to view all reports
CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);

-- Allow admins to update report status
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);

-- 2. RLS for Comments (Admin Deletion)
-- Allow admins to delete any comment
CREATE POLICY "Admins can delete any comment"
ON public.comments
FOR DELETE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);
