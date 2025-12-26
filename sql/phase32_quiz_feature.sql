-- Phase 32: Quiz Feature - Random Tier List Selection

-- Function to get random tier list by tag with exclusions
CREATE OR REPLACE FUNCTION get_random_tier_list_by_tag(
  tag_name TEXT,
  excluded_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  vote_count INTEGER,
  view_count INTEGER,
  user_id UUID,
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
    tl.allow_voting
  FROM tier_lists tl
  JOIN tier_list_tags tlt ON tl.id = tlt.tier_list_id
  JOIN tags t ON tlt.tag_id = t.id
  WHERE t.name = tag_name
    AND tl.id != ALL(excluded_ids)
    AND tl.vote_count > 0
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get random tier list from all tier lists with exclusions
CREATE OR REPLACE FUNCTION get_random_tier_list(
  excluded_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  vote_count INTEGER,
  view_count INTEGER,
  user_id UUID,
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
    tl.allow_voting
  FROM tier_lists tl
  WHERE tl.id != ALL(excluded_ids)
    AND tl.vote_count > 0
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get count of tier lists by tag (with votes only)
CREATE OR REPLACE FUNCTION get_tier_list_count_by_tag(tag_name TEXT)
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(DISTINCT tl.id) INTO total
  FROM tier_lists tl
  JOIN tier_list_tags tlt ON tl.id = tlt.tier_list_id
  JOIN tags t ON tlt.tag_id = t.id
  WHERE t.name = tag_name
    AND tl.vote_count > 0;

  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to get total count of tier lists with votes
CREATE OR REPLACE FUNCTION get_total_tier_list_count()
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*) INTO total
  FROM tier_lists
  WHERE vote_count > 0;

  RETURN total;
END;
$$ LANGUAGE plpgsql;
