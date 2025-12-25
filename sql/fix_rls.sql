-- Fix RLS for tiers table to allow owners of the tier list to modify tiers
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting or incorrect policies
DROP POLICY IF EXISTS "Tiers are viewable by everyone" ON public.tiers;
DROP POLICY IF EXISTS "Tier list owners can insert tiers" ON public.tiers;
DROP POLICY IF EXISTS "Tier list owners can update tiers" ON public.tiers;
DROP POLICY IF EXISTS "Tier list owners can delete tiers" ON public.tiers;
DROP POLICY IF EXISTS "Enable all for users based on user_id" ON public.tiers;

-- Allow read access to everyone
CREATE POLICY "Tiers are viewable by everyone" ON public.tiers
  FOR SELECT USING (true);

-- Allow insert/update/delete only if the user owns the parent tier_list
CREATE POLICY "Tier list owners can insert tiers" ON public.tiers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tier_lists
      WHERE id = tier_list_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Tier list owners can update tiers" ON public.tiers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tier_lists
      WHERE id = tier_list_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Tier list owners can delete tiers" ON public.tiers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tier_lists
      WHERE id = tier_list_id
      AND user_id = auth.uid()
    )
  );

-- Fix RLS for items table as well, as it likely has the same issue
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Items are viewable by everyone" ON public.items;
DROP POLICY IF EXISTS "Tier list owners can insert items" ON public.items;
DROP POLICY IF EXISTS "Tier list owners can update items" ON public.items;
DROP POLICY IF EXISTS "Tier list owners can delete items" ON public.items;
DROP POLICY IF EXISTS "Enable all for users based on user_id" ON public.items;

CREATE POLICY "Items are viewable by everyone" ON public.items
  FOR SELECT USING (true);

CREATE POLICY "Tier list owners can insert items" ON public.items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tier_lists
      WHERE id = tier_list_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Tier list owners can update items" ON public.items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tier_lists
      WHERE id = tier_list_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Tier list owners can delete items" ON public.items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tier_lists
      WHERE id = tier_list_id
      AND user_id = auth.uid()
    )
  );
