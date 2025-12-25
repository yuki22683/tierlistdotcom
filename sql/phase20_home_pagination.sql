-- Update get_home_tier_lists to support pagination
CREATE OR REPLACE FUNCTION get_home_tier_lists(
  sort_type TEXT,
  limit_count INTEGER,
  offset_val INTEGER DEFAULT 0
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
    ) AS thumbnail_url
  FROM tier_lists tl
  LEFT JOIN users u ON tl.user_id = u.id
  ORDER BY
    CASE WHEN sort_type = 'popular' THEN tl.vote_count END DESC,
    CASE WHEN sort_type = 'new' THEN tl.created_at END DESC,
    tl.id DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Update get_popular_items to support pagination
CREATE OR REPLACE FUNCTION get_popular_items(
  limit_count INT,
  offset_val INT DEFAULT 0
)
RETURNS TABLE (
  name TEXT,
  image_url TEXT,
  total_votes BIGINT,
  count_lists BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.name,
    (ARRAY_AGG(i.image_url ORDER BY tl.vote_count DESC) FILTER (WHERE i.image_url IS NOT NULL))[1] as image_url,
    SUM(tl.vote_count) as total_votes,
    COUNT(DISTINCT tl.id) as count_lists
  FROM items i
  JOIN tier_lists tl ON i.tier_list_id = tl.id
  WHERE i.name IS NOT NULL AND i.name != ''
  GROUP BY i.name
  HAVING SUM(tl.vote_count) > 0
  ORDER BY total_votes DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Update get_popular_tags to support pagination
CREATE OR REPLACE FUNCTION get_popular_tags(
  limit_count INT,
  offset_val INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  total_votes BIGINT,
  count_lists BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    SUM(tl.vote_count) as total_votes,
    COUNT(DISTINCT tl.id) as count_lists
  FROM tags t
  JOIN tier_list_tags tlt ON t.id = tlt.tag_id
  JOIN tier_lists tl ON tlt.tier_list_id = tl.id
  GROUP BY t.id, t.name
  HAVING SUM(tl.vote_count) > 0
  ORDER BY total_votes DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
