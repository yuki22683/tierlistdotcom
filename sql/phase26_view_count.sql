-- Add view_count column to tier_lists table
ALTER TABLE public.tier_lists
ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

-- Create index on view_count for sorting
CREATE INDEX idx_tier_lists_view_count ON public.tier_lists(view_count DESC);

-- Update existing RPC functions to include view_count

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_home_tier_lists(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_related_tier_lists(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.search_tier_lists(TEXT, INTEGER, INTEGER);

-- Update get_home_tier_lists function
CREATE OR REPLACE FUNCTION public.get_home_tier_lists(
  p_sort_by TEXT DEFAULT 'popular',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  vote_count INTEGER,
  view_count INTEGER,
  allow_voting BOOLEAN,
  thumbnail_url TEXT,
  users JSONB,
  tags JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tl.id,
    tl.title,
    tl.description,
    tl.created_at,
    tl.user_id,
    tl.vote_count,
    tl.view_count,
    tl.allow_voting,
    tl.thumbnail_url,
    jsonb_build_object(
      'username', u.username,
      'avatar_url', u.avatar_url
    ) AS users,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('name', t.name))
        FROM tier_list_tags tlt
        JOIN tags t ON t.id = tlt.tag_id
        WHERE tlt.tier_list_id = tl.id
      ),
      '[]'::jsonb
    ) AS tags
  FROM tier_lists tl
  LEFT JOIN users u ON tl.user_id = u.id
  ORDER BY
    CASE WHEN p_sort_by = 'popular' THEN tl.vote_count END DESC,
    CASE WHEN p_sort_by = 'latest' THEN tl.created_at END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Update get_related_tier_lists function
CREATE OR REPLACE FUNCTION public.get_related_tier_lists(p_tier_list_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  vote_count INTEGER,
  view_count INTEGER,
  allow_voting BOOLEAN,
  thumbnail_url TEXT,
  users JSONB,
  tags JSONB,
  similarity_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH target_tags AS (
    SELECT tlt.tag_id
    FROM tier_list_tags tlt
    WHERE tlt.tier_list_id = p_tier_list_id
  ),
  related_lists AS (
    SELECT
      tl.id,
      tl.title,
      tl.description,
      tl.created_at,
      tl.user_id,
      tl.vote_count,
      tl.view_count,
      tl.allow_voting,
      tl.thumbnail_url,
      COUNT(tlt.tag_id) AS common_tags
    FROM tier_lists tl
    INNER JOIN tier_list_tags tlt ON tlt.tier_list_id = tl.id
    WHERE tlt.tag_id IN (SELECT tag_id FROM target_tags)
      AND tl.id != p_tier_list_id
    GROUP BY tl.id, tl.title, tl.description, tl.created_at, tl.user_id, tl.vote_count, tl.view_count, tl.allow_voting, tl.thumbnail_url
    ORDER BY common_tags DESC, tl.vote_count DESC
    LIMIT p_limit
  )
  SELECT
    rl.id,
    rl.title,
    rl.description,
    rl.created_at,
    rl.user_id,
    rl.vote_count,
    rl.view_count,
    rl.allow_voting,
    rl.thumbnail_url,
    jsonb_build_object(
      'username', u.username,
      'avatar_url', u.avatar_url
    ) AS users,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('name', t.name))
        FROM tier_list_tags tlt
        JOIN tags t ON t.id = tlt.tag_id
        WHERE tlt.tier_list_id = rl.id
      ),
      '[]'::jsonb
    ) AS tags,
    rl.common_tags AS similarity_score
  FROM related_lists rl
  LEFT JOIN users u ON rl.user_id = u.id;
END;
$$ LANGUAGE plpgsql;

-- Update search_tier_lists function
CREATE OR REPLACE FUNCTION public.search_tier_lists(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  vote_count INTEGER,
  view_count INTEGER,
  allow_voting BOOLEAN,
  thumbnail_url TEXT,
  users JSONB,
  tags JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tl.id,
    tl.title,
    tl.description,
    tl.created_at,
    tl.user_id,
    tl.vote_count,
    tl.view_count,
    tl.allow_voting,
    tl.thumbnail_url,
    jsonb_build_object(
      'username', u.username,
      'avatar_url', u.avatar_url
    ) AS users,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('name', t.name))
        FROM tier_list_tags tlt
        JOIN tags t ON t.id = tlt.tag_id
        WHERE tlt.tier_list_id = tl.id
      ),
      '[]'::jsonb
    ) AS tags
  FROM tier_lists tl
  LEFT JOIN users u ON tl.user_id = u.id
  WHERE tl.title ILIKE '%' || p_query || '%'
     OR tl.description ILIKE '%' || p_query || '%'
     OR EXISTS (
       SELECT 1 FROM tier_list_tags tlt
       JOIN tags t ON t.id = tlt.tag_id
       WHERE tlt.tier_list_id = tl.id
       AND t.name ILIKE '%' || p_query || '%'
     )
  ORDER BY tl.vote_count DESC, tl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
