-- Phase 33: Fix Trending Items Logic
-- Ensure Trending Items are based strictly on individual item detail page views (item_views table)
-- and NOT on the sum of tier list views.

-- 1. Update get_trending_items function
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
    iv.view_count::BIGINT as total_views,
    COUNT(DISTINCT i.tier_list_id)::BIGINT as count_lists
  FROM item_views iv
  JOIN items i ON iv.name = i.name
  JOIN tier_lists tl ON i.tier_list_id = tl.id
  WHERE i.name IS NOT NULL AND i.name != ''
  GROUP BY i.name, iv.view_count
  HAVING iv.view_count > 0
  ORDER BY iv.view_count DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 2. Update get_trending_items_count function
CREATE OR REPLACE FUNCTION get_trending_items_count()
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total FROM (
    SELECT iv.name
    FROM item_views iv
    JOIN items i ON iv.name = i.name
    WHERE iv.view_count > 0
    GROUP BY iv.name
  ) AS subquery;

  RETURN total;
END;
$$ LANGUAGE plpgsql;
