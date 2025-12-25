-- Update search_popular_items to support pagination
DROP FUNCTION IF EXISTS search_popular_items(text, integer);

CREATE OR REPLACE FUNCTION search_popular_items(
  search_query TEXT,
  limit_count INT,
  offset_val INT DEFAULT 0
)
RETURNS TABLE (
  name TEXT,
  image_url TEXT,
  total_votes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.name,
    (ARRAY_AGG(i.image_url ORDER BY tl.vote_count DESC) FILTER (WHERE i.image_url IS NOT NULL))[1] as image_url,
    COALESCE(SUM(tl.vote_count), 0) as total_votes
  FROM items i
  JOIN tier_lists tl ON i.tier_list_id = tl.id
  WHERE
    translate(i.name, 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん', 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン')
    ILIKE '%' || translate(search_query, 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん', 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン') || '%'
    AND i.name IS NOT NULL
    AND i.name != ''
    AND i.name != '名無し'
  GROUP BY i.name
  ORDER BY total_votes DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Count function for search_popular_items
CREATE OR REPLACE FUNCTION search_popular_items_count(search_query TEXT)
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total FROM (
    SELECT i.name
    FROM items i
    JOIN tier_lists tl ON i.tier_list_id = tl.id
    WHERE
      translate(i.name, 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん', 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン')
      ILIKE '%' || translate(search_query, 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん', 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン') || '%'
      AND i.name IS NOT NULL
      AND i.name != ''
      AND i.name != '名無し'
    GROUP BY i.name
  ) as sub;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Update search_popular_tags to support pagination
DROP FUNCTION IF EXISTS search_popular_tags(text, integer);

CREATE OR REPLACE FUNCTION search_popular_tags(
  search_query TEXT,
  limit_count INT,
  offset_val INT DEFAULT 0
)
RETURNS TABLE (
  name TEXT,
  total_votes BIGINT,
  count_lists BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.name,
    COALESCE(SUM(tl.vote_count), 0) as total_votes,
    COUNT(DISTINCT tl.id) as count_lists
  FROM tags t
  JOIN tier_list_tags tlt ON t.id = tlt.tag_id
  JOIN tier_lists tl ON tlt.tier_list_id = tl.id
  WHERE
    translate(t.name, 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん', 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン')
    ILIKE '%' || translate(search_query, 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん', 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン') || '%'
  GROUP BY t.id, t.name
  ORDER BY total_votes DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Count function for search_popular_tags
CREATE OR REPLACE FUNCTION search_popular_tags_count(search_query TEXT)
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total FROM (
    SELECT t.id
    FROM tags t
    JOIN tier_list_tags tlt ON t.id = tlt.tag_id
    JOIN tier_lists tl ON tlt.tier_list_id = tl.id
    WHERE
      translate(t.name, 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん', 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン')
      ILIKE '%' || translate(search_query, 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをん', 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲン') || '%'
    GROUP BY t.id
  ) as sub;
  RETURN total;
END;
$$ LANGUAGE plpgsql;
