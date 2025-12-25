-- Phase 6: Text Items Support

ALTER TABLE public.items ADD COLUMN background_color TEXT;
ALTER TABLE public.items ADD COLUMN is_text_item BOOLEAN DEFAULT FALSE;
