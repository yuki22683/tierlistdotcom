-- 1. Add is_admin column to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Set admin user
-- Note: This requires permissions to read auth.users. 
-- If running from the Supabase SQL editor, this typically works.
UPDATE public.users
SET is_admin = TRUE
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'yuki22683@gmail.com'
);

-- 3. RLS Policy for Deletion
DROP POLICY IF EXISTS "Admins can delete any tier list" ON public.tier_lists;

CREATE POLICY "Admins can delete any tier list"
ON public.tier_lists
FOR DELETE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);
