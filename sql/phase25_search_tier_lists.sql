-- Function to search tier lists with advanced filtering and optimized thumbnail selection
-- This function ensures the thumbnail is the image item with the highest average score (lowest average tier order).

DROP FUNCTION IF EXISTS search_tier_lists;

CREATE OR REPLACE FUNCTION search_tier_lists(
  search_query TEXT DEFAULT '',
  search_tag TEXT DEFAULT '',
  user_id_filter UUID DEFAULT NULL,
  category_id_filter UUID DEFAULT NULL, -- Filter by category
  ids_filter UUID[] DEFAULT NULL, -- Filter by specific IDs
  sort_by TEXT DEFAULT 'popular', -- 'popular', 'new', or 'none'
  limit_count INTEGER DEFAULT 20,
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
  WHERE
    (search_query = '' OR tl.title ILIKE '%' || search_query || '%' OR tl.description ILIKE '%' || search_query || '%')
    AND
    (search_tag = '' OR EXISTS (
        SELECT 1 FROM tier_list_tags tlt
        JOIN tags tg ON tlt.tag_id = tg.id
        WHERE tlt.tier_list_id = tl.id AND tg.name = search_tag
    ))
    AND
    (user_id_filter IS NULL OR tl.user_id = user_id_filter)
    AND
    (category_id_filter IS NULL OR tl.category_id = category_id_filter)
    AND
    (ids_filter IS NULL OR tl.id = ANY(ids_filter))
  ORDER BY
    CASE WHEN sort_by = 'popular' THEN tl.vote_count END DESC,
    CASE WHEN sort_by = 'new' THEN tl.created_at END DESC,
    CASE WHEN sort_by = 'none' THEN 0 END,
    tl.id DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
