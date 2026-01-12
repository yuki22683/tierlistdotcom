-- Function to get related items based on shared tags
-- Returns items from tier lists that share tags with the given tier list
-- Also includes items from the current tier list
-- Items with the same name are grouped together

-- Drop existing function first
DROP FUNCTION IF EXISTS get_related_items(uuid, integer);

CREATE OR REPLACE FUNCTION get_related_items(p_tier_list_id UUID, p_limit INT)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  item_image_url TEXT,
  item_is_text_item BOOLEAN,
  tier_list_id UUID,
  tier_list_title TEXT,
  tier_list_vote_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Use the item_id from the most popular tier list (for backwards compatibility)
    (ARRAY_AGG(i.id ORDER BY tl.vote_count DESC))[1] as item_id,
    i.name as item_name,
    -- Use image from the most popular tier list that has an image
    (ARRAY_AGG(i.image_url ORDER BY tl.vote_count DESC) FILTER (WHERE i.image_url IS NOT NULL))[1] as item_image_url,
    -- is_text_item: false if any occurrence has an image
    bool_and(COALESCE(i.is_text_item, false)) as item_is_text_item,
    -- Use tier_list info from the most popular one
    (ARRAY_AGG(tl.id ORDER BY tl.vote_count DESC))[1] as tier_list_id,
    (ARRAY_AGG(tl.title ORDER BY tl.vote_count DESC))[1] as tier_list_title,
    MAX(tl.vote_count) as tier_list_vote_count
  FROM items i
  JOIN tier_lists tl ON i.tier_list_id = tl.id
  WHERE tl.id IN (
      -- Find tier lists that share tags with the given tier list (including current tier list)
      SELECT DISTINCT tlt.tier_list_id
      FROM tier_list_tags tlt
      WHERE tlt.tag_id IN (
          SELECT tlt2.tag_id
          FROM tier_list_tags tlt2
          WHERE tlt2.tier_list_id = p_tier_list_id
      )
  )
  -- Prefer items with images or text items
  AND (i.image_url IS NOT NULL OR i.is_text_item = true)
  -- Filter out empty or unnamed items
  AND i.name IS NOT NULL
  AND i.name != ''
  AND i.name != '名無し'
  -- Group by item name to merge same-named items
  GROUP BY i.name
  -- Order by total popularity across all tier lists
  ORDER BY MAX(tl.vote_count) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
