-- Ensure is_admin column exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Enable RLS on reports if not already (it should be)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 1. Reports: Admin View
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);

-- 2. Reports: Admin Update
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);

-- 3. Comments: Admin Delete
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
CREATE POLICY "Admins can delete any comment"
ON public.comments
FOR DELETE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);

-- 4. Verify Admin User (Optional: You can uncomment and set your email if needed)
-- UPDATE public.users SET is_admin = TRUE WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');
