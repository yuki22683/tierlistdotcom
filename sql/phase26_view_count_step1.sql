-- Step 1: Add view_count column only
-- Run this first

ALTER TABLE public.tier_lists
ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Create index on view_count for sorting
CREATE INDEX IF NOT EXISTS idx_tier_lists_view_count ON public.tier_lists(view_count DESC);
