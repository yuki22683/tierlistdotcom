-- 注目アイテムの修正
-- アイテム詳細ページの閲覧数（item_view_counts テーブル）のみを使用するように修正

-- まず、既存の関数を削除
DROP FUNCTION IF EXISTS get_trending_items(integer, integer);
DROP FUNCTION IF EXISTS get_trending_items_count();

-- 修正版: アイテム詳細ページの閲覧数のみを使用
CREATE FUNCTION get_trending_items(limit_count INT, offset_val INT)
RETURNS TABLE (
  name TEXT,
  image_url TEXT,
  total_detail_views BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ivc.item_name as name,
    (
      SELECT i.image_url
      FROM items i
      WHERE i.name = ivc.item_name
      AND i.image_url IS NOT NULL
      LIMIT 1
    ) as image_url,
    ivc.view_count as total_detail_views
  FROM item_view_counts ivc
  WHERE ivc.item_name IS NOT NULL
    AND ivc.item_name != ''
  ORDER BY ivc.view_count DESC
  LIMIT limit_count
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 注目アイテムのカウント用関数も修正
CREATE FUNCTION get_trending_items_count()
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT item_name)
    FROM item_view_counts
    WHERE item_name IS NOT NULL
      AND item_name != ''
  );
END;
$$ LANGUAGE plpgsql;

-- 同様に、人気アイテム（get_popular_items）も確認
-- もし同じ問題があれば、同様に修正
