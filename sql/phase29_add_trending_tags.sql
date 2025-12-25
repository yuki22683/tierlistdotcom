-- Add trending tags (view count based) function

-- 1. Create get_trending_tags function
CREATE OR REPLACE FUNCTION get_trending_tags(
  limit_count INT,
  offset_val INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  total_views BIGINT,
  count_lists BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    SUM(tl.view_count) as total_views,
    COUNT(DISTINCT tl.id) as count_lists
  FROM tags t
  JOIN tier_list_tags tlt ON t.id = tlt.tag_id
  JOIN tier_lists tl ON tlt.tier_list_id = tl.id
  GROUP BY t.id, t.name
  HAVING SUM(tl.view_count) > 0
  ORDER BY total_views DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 2. Create count function for trending tags
CREATE OR REPLACE FUNCTION get_trending_tags_count()
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total FROM (
    SELECT t.id
    FROM tags t
    JOIN tier_list_tags tlt ON t.id = tlt.tag_id
    JOIN tier_lists tl ON tlt.tier_list_id = tl.id
    GROUP BY t.id, t.name
    HAVING SUM(tl.view_count) > 0
  ) AS subquery;

  RETURN total;
END;
$$ LANGUAGE plpgsql;
