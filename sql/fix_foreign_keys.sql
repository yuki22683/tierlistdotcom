-- Fix Foreign Keys to ensure ON DELETE CASCADE for Tier List deletion

-- 1. Tiers
ALTER TABLE public.tiers DROP CONSTRAINT IF EXISTS tiers_tier_list_id_fkey;
ALTER TABLE public.tiers 
  ADD CONSTRAINT tiers_tier_list_id_fkey 
  FOREIGN KEY (tier_list_id) 
  REFERENCES public.tier_lists(id) 
  ON DELETE CASCADE;

-- 2. Items
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_tier_list_id_fkey;
ALTER TABLE public.items 
  ADD CONSTRAINT items_tier_list_id_fkey 
  FOREIGN KEY (tier_list_id) 
  REFERENCES public.tier_lists(id) 
  ON DELETE CASCADE;

-- 3. Votes
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_tier_list_id_fkey;
ALTER TABLE public.votes 
  ADD CONSTRAINT votes_tier_list_id_fkey 
  FOREIGN KEY (tier_list_id) 
  REFERENCES public.tier_lists(id) 
  ON DELETE CASCADE;

-- 4. Vote Items (Indirectly related, but they reference votes and items. 
--    If votes and items are deleted, vote_items should be too.
--    Assuming vote_items references votes(id) and items(id))

ALTER TABLE public.vote_items DROP CONSTRAINT IF EXISTS vote_items_vote_id_fkey;
ALTER TABLE public.vote_items 
  ADD CONSTRAINT vote_items_vote_id_fkey 
  FOREIGN KEY (vote_id) 
  REFERENCES public.votes(id) 
  ON DELETE CASCADE;

ALTER TABLE public.vote_items DROP CONSTRAINT IF EXISTS vote_items_item_id_fkey;
ALTER TABLE public.vote_items 
  ADD CONSTRAINT vote_items_item_id_fkey 
  FOREIGN KEY (item_id) 
  REFERENCES public.items(id) 
  ON DELETE CASCADE;

ALTER TABLE public.vote_items DROP CONSTRAINT IF EXISTS vote_items_tier_id_fkey;
ALTER TABLE public.vote_items 
  ADD CONSTRAINT vote_items_tier_id_fkey 
  FOREIGN KEY (tier_id) 
  REFERENCES public.tiers(id) 
  ON DELETE CASCADE;

-- 5. Comments (Just to be sure)
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_tier_list_id_fkey;
ALTER TABLE public.comments 
  ADD CONSTRAINT comments_tier_list_id_fkey 
  FOREIGN KEY (tier_list_id) 
  REFERENCES public.tier_lists(id) 
  ON DELETE CASCADE;
