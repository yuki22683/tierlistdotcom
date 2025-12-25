-- Phase 5.1: Dislike Feature

-- 1. Add dislike_count to comments
ALTER TABLE public.comments ADD COLUMN dislike_count INTEGER DEFAULT 0;

-- 2. Create Dislikes Table
CREATE TABLE public.dislikes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, comment_id)
);

-- RLS for Dislikes
ALTER TABLE public.dislikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dislikes are viewable by everyone." ON public.dislikes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create dislikes." ON public.dislikes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete own dislikes." ON public.dislikes FOR DELETE USING (auth.uid() = user_id);

-- Triggers for Dislike Count
CREATE OR REPLACE FUNCTION public.handle_new_dislike() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.comments
  SET dislike_count = dislike_count + 1
  WHERE id = new.comment_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_dislike_created
  AFTER INSERT ON public.dislikes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_dislike();

CREATE OR REPLACE FUNCTION public.handle_remove_dislike() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.comments
  SET dislike_count = dislike_count - 1
  WHERE id = old.comment_id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_dislike_deleted
  AFTER DELETE ON public.dislikes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_remove_dislike();
