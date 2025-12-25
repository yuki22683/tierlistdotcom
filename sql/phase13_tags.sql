-- Phase 13: Tags System

-- 1. Tags Table (Unique tag names)
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tier List Tags Junction Table
CREATE TABLE IF NOT EXISTS public.tier_list_tags (
  tier_list_id UUID REFERENCES public.tier_lists(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (tier_list_id, tag_id)
);

-- RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_list_tags ENABLE ROW LEVEL SECURITY;

-- Policies for Tags
DROP POLICY IF EXISTS "Tags are viewable by everyone." ON public.tags;
CREATE POLICY "Tags are viewable by everyone." ON public.tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tags." ON public.tags;
CREATE POLICY "Authenticated users can create tags." ON public.tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for Tier List Tags
DROP POLICY IF EXISTS "Tier list tags are viewable by everyone." ON public.tier_list_tags;
CREATE POLICY "Tier list tags are viewable by everyone." ON public.tier_list_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert tier list tags." ON public.tier_list_tags;
CREATE POLICY "Authenticated users can insert tier list tags." ON public.tier_list_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete tier list tags." ON public.tier_list_tags;
CREATE POLICY "Users can delete tier list tags." ON public.tier_list_tags FOR DELETE USING (auth.role() = 'authenticated');

-- Function to search tags (for suggestions)
CREATE OR REPLACE FUNCTION get_tags_suggestions(search_term TEXT)
RETURNS TABLE (id UUID, name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name
  FROM public.tags t
  LEFT JOIN public.tier_list_tags tlt ON t.id = tlt.tag_id
  LEFT JOIN public.tier_lists tl ON tlt.tier_list_id = tl.id
  WHERE t.name ~* search_term
  GROUP BY t.id, t.name
  ORDER BY COALESCE(SUM(tl.vote_count), 0) DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create a tag safely
CREATE OR REPLACE FUNCTION get_or_create_tag(tag_name TEXT)
RETURNS UUID AS $$
DECLARE
  new_tag_id UUID;
BEGIN
  -- Try to select first
  SELECT id INTO new_tag_id FROM public.tags WHERE name = tag_name;
  
  -- If found, return it
  IF new_tag_id IS NOT NULL THEN
    RETURN new_tag_id;
  END IF;

  -- If not found, insert
  INSERT INTO public.tags (name) VALUES (tag_name) RETURNING id INTO new_tag_id;
  RETURN new_tag_id;

EXCEPTION WHEN unique_violation THEN
  -- Race condition: someone inserted it concurrently
  SELECT id INTO new_tag_id FROM public.tags WHERE name = tag_name;
  RETURN new_tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;