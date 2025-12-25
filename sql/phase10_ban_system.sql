-- Phase 10: Ban System

-- 1. Add is_banned column to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- 2. Update RLS policies to prevent Banned users from creating content

-- Tier Lists (Insert)
DROP POLICY IF EXISTS "Authenticated users can create tier lists." ON public.tier_lists;
CREATE POLICY "Authenticated users can create tier lists." 
ON public.tier_lists FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  auth.uid() = user_id AND
  (SELECT is_banned FROM public.users WHERE id = auth.uid()) = FALSE
);

-- Comments (Insert)
DROP POLICY IF EXISTS "Authenticated users can create comments." ON public.comments;
CREATE POLICY "Authenticated users can create comments." 
ON public.comments FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  (SELECT is_banned FROM public.users WHERE id = auth.uid()) = FALSE
);

-- Votes (Insert) - Assuming votes policy might exist or needs update
-- Check existing votes policy or create one if needed
-- Assuming standard "Authenticated users can vote"
DROP POLICY IF EXISTS "Authenticated users can vote." ON public.votes;
CREATE POLICY "Authenticated users can vote." 
ON public.votes FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  auth.uid() = user_id AND
  (SELECT is_banned FROM public.users WHERE id = auth.uid()) = FALSE
);

-- 3. Allow Admins to update User status (Ban/Unban)
-- This requires UPDATE policy on users table
CREATE POLICY "Admins can update user status"
ON public.users
FOR UPDATE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);

-- 4. Allow Admins to View Banned Users (Select)
-- Admins need to filter users by is_banned
-- Users are already public viewable, so no special SELECT policy needed for listing.
