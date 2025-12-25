-- Add trending items (view count based) function

-- 1. Create get_trending_items function
CREATE OR REPLACE FUNCTION get_trending_items(
  limit_count INT,
  offset_val INT DEFAULT 0
)
RETURNS TABLE (
  name TEXT,
  image_url TEXT,
  total_views BIGINT,
  count_lists BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.name,
    (ARRAY_AGG(i.image_url ORDER BY tl.view_count DESC) FILTER (WHERE i.image_url IS NOT NULL))[1] as image_url,
    SUM(tl.view_count) as total_views,
    COUNT(DISTINCT tl.id) as count_lists
  FROM items i
  JOIN tier_lists tl ON i.tier_list_id = tl.id
  WHERE i.name IS NOT NULL AND i.name != ''
  GROUP BY i.name
  HAVING SUM(tl.view_count) > 0
  ORDER BY total_views DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 2. Create count function for trending items
CREATE OR REPLACE FUNCTION get_trending_items_count()
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total FROM (
    SELECT i.name
    FROM items i
    JOIN tier_lists tl ON i.tier_list_id = tl.id
    WHERE i.name IS NOT NULL AND i.name != ''
    GROUP BY i.name
    HAVING SUM(tl.view_count) > 0
  ) AS subquery;

  RETURN total;
END;
$$ LANGUAGE plpgsql;
