-- Add item view tracking for individual item detail pages

-- 1. Create item_views table to track views per item name
CREATE TABLE IF NOT EXISTS public.item_views (
  name TEXT PRIMARY KEY,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for sorting by view count
CREATE INDEX IF NOT EXISTS idx_item_views_view_count ON public.item_views(view_count DESC);

-- 2. Update get_trending_items function to use item_views with fallback to tier_list view aggregation
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
    COALESCE(iv.view_count, 0)::BIGINT as total_views,
    COUNT(DISTINCT i.tier_list_id) as count_lists
  FROM items i
  JOIN tier_lists tl ON i.tier_list_id = tl.id
  LEFT JOIN item_views iv ON i.name = iv.name
  WHERE i.name IS NOT NULL AND i.name != ''
  GROUP BY i.name, iv.view_count
  HAVING COALESCE(iv.view_count, 0) > 0 OR SUM(tl.view_count) > 0
  ORDER BY COALESCE(iv.view_count, 0) DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 3. Update count function for trending items
CREATE OR REPLACE FUNCTION get_trending_items_count()
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total FROM (
    SELECT i.name
    FROM items i
    JOIN tier_lists tl ON i.tier_list_id = tl.id
    LEFT JOIN item_views iv ON i.name = iv.name
    WHERE i.name IS NOT NULL AND i.name != ''
    GROUP BY i.name, iv.view_count
    HAVING COALESCE(iv.view_count, 0) > 0 OR SUM(tl.view_count) > 0
  ) AS subquery;

  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to increment item view count
CREATE OR REPLACE FUNCTION increment_item_view(item_name TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO item_views (name, view_count, last_viewed_at)
  VALUES (item_name, 1, CURRENT_TIMESTAMP)
  ON CONFLICT (name)
  DO UPDATE SET
    view_count = item_views.view_count + 1,
    last_viewed_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
