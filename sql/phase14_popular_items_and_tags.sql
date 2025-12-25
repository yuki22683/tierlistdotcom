-- Function to get popular items based on total votes of tier lists they belong to
CREATE OR REPLACE FUNCTION get_popular_items(limit_count INT)
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
    -- Pick the image from the tier list with the most votes, or just an arbitrary non-null one
    (ARRAY_AGG(i.image_url ORDER BY tl.vote_count DESC) FILTER (WHERE i.image_url IS NOT NULL))[1] as image_url,
    SUM(tl.vote_count) as total_votes,
    COUNT(DISTINCT tl.id) as count_lists
  FROM items i
  JOIN tier_lists tl ON i.tier_list_id = tl.id
  WHERE i.name IS NOT NULL AND i.name != ''
  GROUP BY i.name
  HAVING SUM(tl.vote_count) > 0
  ORDER BY total_votes DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular tags (categories) based on total votes of tier lists they belong to
CREATE OR REPLACE FUNCTION get_popular_tags(limit_count INT)
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
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
