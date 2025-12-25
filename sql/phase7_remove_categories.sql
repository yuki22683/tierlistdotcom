-- Phase 7: Remove Categories Concept

-- 1. Make category_id nullable in tier_lists
ALTER TABLE public.tier_lists ALTER COLUMN category_id DROP NOT NULL;

-- 2. Optional: If we want to drop the foreign key constraint entirely (safe if we delete categories later)
-- ALTER TABLE public.tier_lists DROP CONSTRAINT tier_lists_category_id_fkey;
