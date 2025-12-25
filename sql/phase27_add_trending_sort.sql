-- Add trending (view count) sort type to get_home_tier_lists function

DROP FUNCTION IF EXISTS public.get_home_tier_lists(TEXT, INTEGER, INTEGER);

CREATE FUNCTION public.get_home_tier_lists(
  sort_type TEXT,
  limit_count INTEGER,
  offset_val INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  vote_count INTEGER,
  view_count INTEGER,
  user_id UUID,
  user_full_name TEXT,
  user_avatar_url TEXT,
  thumbnail_url TEXT,
  allow_voting BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tl.id,
    tl.title,
    tl.description,
    tl.created_at,
    tl.vote_count,
    tl.view_count,
    tl.user_id,
    u.full_name AS user_full_name,
    u.avatar_url AS user_avatar_url,
    COALESCE(
      (
        SELECT i.image_url
        FROM items i
        JOIN vote_items vi ON vi.item_id = i.id
        JOIN tiers t ON t.id = vi.tier_id
        WHERE i.tier_list_id = tl.id
          AND i.image_url IS NOT NULL
          AND (i.is_text_item IS FALSE OR i.is_text_item IS NULL)
        GROUP BY i.id
        ORDER BY AVG(t."order") ASC, COUNT(vi.id) DESC
        LIMIT 1
      ),
      (
        SELECT i.image_url
        FROM items i
        WHERE i.tier_list_id = tl.id
          AND i.image_url IS NOT NULL
          AND (i.is_text_item IS FALSE OR i.is_text_item IS NULL)
        LIMIT 1
      ),
      '/logo.png'
    ) AS thumbnail_url,
    tl.allow_voting
  FROM tier_lists tl
  LEFT JOIN users u ON tl.user_id = u.id
  ORDER BY
    CASE WHEN sort_type = 'popular' THEN tl.vote_count END DESC,
    CASE WHEN sort_type = 'new' THEN tl.created_at END DESC,
    CASE WHEN sort_type = 'trending' THEN tl.view_count END DESC,
    tl.id DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
