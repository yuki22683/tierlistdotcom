-- Function to search popular items by name
CREATE OR REPLACE FUNCTION search_popular_items(search_query TEXT, limit_count INT)
RETURNS TABLE (
  name TEXT,
  total_votes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.name,
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
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
