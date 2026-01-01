-- Step 1: Create a normalization function for search
CREATE OR REPLACE FUNCTION public.normalize_for_search(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN '';
  END IF;
  -- 1. Translate Hiragana to Katakana
  -- 2. Remove all whitespace (including full-width space)
  RETURN regexp_replace(
    translate(
      input_text,
      'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん',
      'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン'
    ),
    '[\s　]+', '', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Update search_tier_lists
CREATE OR REPLACE FUNCTION public.search_tier_lists(
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
DECLARE
  normalized_query TEXT;
BEGIN
  normalized_query := public.normalize_for_search(search_query);
  
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
    (search_query = '' OR 
     public.normalize_for_search(tl.title) ILIKE '%' || normalized_query || '%' OR 
     public.normalize_for_search(tl.description) ILIKE '%' || normalized_query || '%')
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

-- Step 3: Add search_tier_lists_count
CREATE OR REPLACE FUNCTION public.search_tier_lists_count(
  search_query TEXT DEFAULT '',
  search_tag TEXT DEFAULT '',
  user_id_filter UUID DEFAULT NULL,
  category_id_filter UUID DEFAULT NULL,
  ids_filter UUID[] DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  normalized_query TEXT;
  total BIGINT;
BEGIN
  normalized_query := public.normalize_for_search(search_query);

  SELECT COUNT(*) INTO total
  FROM tier_lists tl
  WHERE
    (search_query = '' OR 
     public.normalize_for_search(tl.title) ILIKE '%' || normalized_query || '%' OR 
     public.normalize_for_search(tl.description) ILIKE '%' || normalized_query || '%')
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
    (ids_filter IS NULL OR tl.id = ANY(ids_filter));
    
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update search_popular_items
CREATE OR REPLACE FUNCTION public.search_popular_items(
  search_query TEXT,
  limit_count INT,
  offset_val INT DEFAULT 0
)
RETURNS TABLE (
  name TEXT,
  image_url TEXT,
  total_votes BIGINT
) AS $$
DECLARE
  normalized_query TEXT;
BEGIN
  normalized_query := public.normalize_for_search(search_query);

  RETURN QUERY
  SELECT
    i.name,
    (ARRAY_AGG(i.image_url ORDER BY tl.vote_count DESC) FILTER (WHERE i.image_url IS NOT NULL))[1] as image_url,
    COALESCE(SUM(tl.vote_count), 0) as total_votes
  FROM items i
  JOIN tier_lists tl ON i.tier_list_id = tl.id
  WHERE
    public.normalize_for_search(i.name) ILIKE '%' || normalized_query || '%'
    AND i.name IS NOT NULL
    AND i.name != ''
    AND i.name != '名無し'
  GROUP BY i.name
  ORDER BY total_votes DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update search_popular_items_count
CREATE OR REPLACE FUNCTION public.search_popular_items_count(search_query TEXT)
RETURNS BIGINT AS $$
DECLARE
  normalized_query TEXT;
  total BIGINT;
BEGIN
  normalized_query := public.normalize_for_search(search_query);

  SELECT COUNT(*) INTO total FROM (
    SELECT i.name
    FROM items i
    JOIN tier_lists tl ON i.tier_list_id = tl.id
    WHERE
      public.normalize_for_search(i.name) ILIKE '%' || normalized_query || '%'
      AND i.name IS NOT NULL
      AND i.name != ''
      AND i.name != '名無し'
    GROUP BY i.name
  ) as sub;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update search_popular_tags
CREATE OR REPLACE FUNCTION public.search_popular_tags(
  search_query TEXT,
  limit_count INT,
  offset_val INT DEFAULT 0
)
RETURNS TABLE (
  name TEXT,
  total_votes BIGINT,
  count_lists BIGINT
) AS $$
DECLARE
  normalized_query TEXT;
BEGIN
  normalized_query := public.normalize_for_search(search_query);

  RETURN QUERY
  SELECT
    t.name,
    COALESCE(SUM(tl.vote_count), 0) as total_votes,
    COUNT(DISTINCT tl.id) as count_lists
  FROM tags t
  JOIN tier_list_tags tlt ON t.id = tlt.tag_id
  JOIN tier_lists tl ON tlt.tier_list_id = tl.id
  WHERE
    public.normalize_for_search(t.name) ILIKE '%' || normalized_query || '%'
  GROUP BY t.id, t.name
  ORDER BY total_votes DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Update search_popular_tags_count
CREATE OR REPLACE FUNCTION public.search_popular_tags_count(search_query TEXT)
RETURNS BIGINT AS $$
DECLARE
  normalized_query TEXT;
  total BIGINT;
BEGIN
  normalized_query := public.normalize_for_search(search_query);

  SELECT COUNT(*) INTO total FROM (
    SELECT t.id
    FROM tags t
    JOIN tier_list_tags tlt ON t.id = tlt.tag_id
    JOIN tier_lists tl ON tlt.tier_list_id = tl.id
    WHERE
      public.normalize_for_search(t.name) ILIKE '%' || normalized_query || '%'
    GROUP BY t.id
  ) as sub;
  RETURN total;
END;
$$ LANGUAGE plpgsql;
