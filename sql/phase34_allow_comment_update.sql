-- Add policy to allow users to update their own comments
CREATE POLICY "Users can update own comments." ON public.comments FOR UPDATE USING (auth.uid() = user_id);
