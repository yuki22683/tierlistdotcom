-- Phase 12: User Ranking System

-- Function to get top users by total votes received on their tier lists
CREATE OR REPLACE FUNCTION get_user_rankings(limit_count INT DEFAULT 100)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  total_votes BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator to access users/tier_lists
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.full_name,
    u.avatar_url,
    COALESCE(SUM(tl.vote_count), 0)::BIGINT as total_votes
  FROM
    public.users u
  JOIN
    public.tier_lists tl ON u.id = tl.user_id
  GROUP BY
    u.id, u.full_name, u.avatar_url
  HAVING
    SUM(tl.vote_count) > 0 -- Only show users who have received votes
  ORDER BY
    total_votes DESC
  LIMIT limit_count;
END;
$$;
