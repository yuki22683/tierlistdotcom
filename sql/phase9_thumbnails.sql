-- Function to get popular/new tier lists with their top-rated image item as thumbnail
CREATE OR REPLACE FUNCTION get_home_tier_lists(
  sort_type TEXT, -- 'popular' or 'new'
  limit_count INTEGER
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  vote_count INTEGER,
  user_id UUID,
  user_full_name TEXT,
  user_avatar_url TEXT,
  thumbnail_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tl.id,
    tl.title,
    tl.description,
    tl.created_at,
    tl.vote_count,
    tl.user_id,
    u.full_name AS user_full_name,
    u.avatar_url AS user_avatar_url,
    COALESCE(
      (
        -- Subquery to find the best image item based on votes
        SELECT i.image_url
        FROM items i
        JOIN vote_items vi ON vi.item_id = i.id
        JOIN tiers t ON t.id = vi.tier_id
        WHERE i.tier_list_id = tl.id
          AND i.image_url IS NOT NULL
          AND (i.is_text_item IS FALSE OR i.is_text_item IS NULL)
        GROUP BY i.id
        -- Order by Average Tier Order (Ascending = Best Tier first, e.g. 0 is S)
        -- Tie-break with number of votes (Descending = More popular is better)
        ORDER BY AVG(t."order") ASC, COUNT(vi.id) DESC
        LIMIT 1
      ),
      (
        -- Fallback: Just pick the first image item available
        SELECT i.image_url 
        FROM items i 
        WHERE i.tier_list_id = tl.id 
          AND i.image_url IS NOT NULL 
          AND (i.is_text_item IS FALSE OR i.is_text_item IS NULL)
        LIMIT 1
      ),
      '/logo.png'
    ) AS thumbnail_url
  FROM tier_lists tl
  LEFT JOIN users u ON tl.user_id = u.id
  ORDER BY
    CASE WHEN sort_type = 'popular' THEN tl.vote_count END DESC,
    CASE WHEN sort_type = 'new' THEN tl.created_at END DESC,
    -- Secondary sort for stability
    tl.id DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
