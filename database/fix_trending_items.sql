-- 注目アイテムの修正
-- アイテム詳細ページの閲覧数（item_views テーブル）のみを使用するように修正

-- まず、既存の関数を削除
DROP FUNCTION IF EXISTS get_trending_items(integer, integer);
DROP FUNCTION IF EXISTS get_trending_items_count();

-- 修正版: アイテム詳細ページの閲覧数のみを使用（item_views テーブル）
CREATE FUNCTION get_trending_items(limit_count INT, offset_val INT)
RETURNS TABLE (
  name TEXT,
  image_url TEXT,
  total_detail_views BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    iv.name as name,
    (
      SELECT i.image_url
      FROM items i
      WHERE i.name = iv.name
      AND i.image_url IS NOT NULL
      LIMIT 1
    ) as image_url,
    iv.view_count as total_detail_views
  FROM item_views iv
  WHERE iv.name IS NOT NULL
    AND iv.name != ''
    AND iv.view_count > 0
  ORDER BY iv.view_count DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 注目アイテムのカウント用関数も修正
CREATE FUNCTION get_trending_items_count()
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM item_views
    WHERE name IS NOT NULL
      AND name != ''
      AND view_count > 0
  );
END;
$$ LANGUAGE plpgsql;

-- 同様に、人気アイテム（get_popular_items）も確認
-- もし同じ問題があれば、同様に修正
