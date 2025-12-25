-- Function to get related tier lists based on shared tags
-- Includes smart thumbnail selection similar to get_home_tier_lists
CREATE OR REPLACE FUNCTION get_related_tier_lists(p_tier_list_id UUID, p_limit INT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  vote_count INTEGER,
  created_at TIMESTAMPTZ,
  user_id UUID,
  user_full_name TEXT,
  user_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tl.id,
    tl.title,
    tl.description,
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
    ) AS thumbnail_url,
    tl.vote_count,
    tl.created_at,
    u.id as user_id,
    u.full_name as user_full_name,
    u.avatar_url as user_avatar_url
  FROM tier_lists tl
  JOIN users u ON tl.user_id = u.id
  WHERE tl.id IN (
      SELECT DISTINCT tlt.tier_list_id
      FROM tier_list_tags tlt
      WHERE tlt.tag_id IN (
          SELECT tag_id FROM tier_list_tags WHERE tier_list_id = p_tier_list_id
      )
      AND tlt.tier_list_id != p_tier_list_id
  )
  ORDER BY tl.vote_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
