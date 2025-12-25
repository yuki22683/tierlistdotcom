-- Phase 5.2: Report Feature

-- 1. Create Reports Table
CREATE TABLE public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins/Mods should view reports (Currently no admin role defined, so limiting to creator for now, or just insert-only for users)
-- For now, regular users can only insert their own reports.
CREATE POLICY "Authenticated users can create reports." 
ON public.reports FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Users can view their own reports (optional, good for history)
CREATE POLICY "Users can view own reports." 
ON public.reports FOR SELECT 
USING (auth.uid() = user_id);

-- (Future) Admin policy would be added here
