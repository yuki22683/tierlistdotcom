-- Drop table if exists to allow clean recreation
DROP TABLE IF EXISTS public.inquiries;

-- Create inquiries table
CREATE TABLE public.inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Changed to refer to public.users
    email TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert inquiries (since it's a public contact form)
CREATE POLICY "Anyone can insert inquiries"
ON public.inquiries
FOR INSERT
WITH CHECK (true);

-- Only admins can view inquiries
CREATE POLICY "Admins can view all inquiries"
ON public.inquiries
FOR SELECT
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);

-- Only admins can update inquiries (e.g. status)
CREATE POLICY "Admins can update inquiries"
ON public.inquiries
FOR UPDATE
USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);