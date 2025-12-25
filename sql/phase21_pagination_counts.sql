-- Count function for popular items
CREATE OR REPLACE FUNCTION get_popular_items_count()
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
    HAVING SUM(tl.vote_count) > 0
  ) as sub;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Count function for popular tags
CREATE OR REPLACE FUNCTION get_popular_tags_count()
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total FROM (
    SELECT t.id
    FROM tags t
    JOIN tier_list_tags tlt ON t.id = tlt.tag_id
    JOIN tier_lists tl ON tlt.tier_list_id = tl.id
    GROUP BY t.id
    HAVING SUM(tl.vote_count) > 0
  ) as sub;
  RETURN total;
END;
$$ LANGUAGE plpgsql;
