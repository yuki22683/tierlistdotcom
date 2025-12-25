-- Add allow_voting column to tier_lists table
ALTER TABLE public.tier_lists 
ADD COLUMN allow_voting BOOLEAN NOT NULL DEFAULT TRUE;
