-- Step 2: Update RPC functions
-- Run this after Step 1 succeeds

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_home_tier_lists(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_related_tier_lists(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.search_tier_lists(TEXT, TEXT, UUID, UUID, UUID[], TEXT, INTEGER, INTEGER);

-- Update get_home_tier_lists function
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
    tl.id DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Update get_related_tier_lists function
CREATE FUNCTION public.get_related_tier_lists(p_tier_list_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  vote_count INTEGER,
  view_count INTEGER,
  created_at TIMESTAMPTZ,
  user_id UUID,
  user_full_name TEXT,
  user_avatar_url TEXT,
  allow_voting BOOLEAN
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
    tl.view_count,
    tl.created_at,
    u.id as user_id,
    u.full_name as user_full_name,
    u.avatar_url as user_avatar_url,
    tl.allow_voting
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

-- Update search_tier_lists function
CREATE FUNCTION public.search_tier_lists(
  search_query TEXT DEFAULT '',
  search_tag TEXT DEFAULT '',
  user_id_filter UUID DEFAULT NULL,
  category_id_filter UUID DEFAULT NULL,
  ids_filter UUID[] DEFAULT NULL,
  sort_by TEXT DEFAULT 'popular',
  limit_count INTEGER DEFAULT 20,
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
