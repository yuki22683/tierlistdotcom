-- 注目アイテムのデータを確認

-- 1. item_view_counts テーブルのデータ件数を確認
SELECT COUNT(*) as total_records FROM item_view_counts;

-- 2. item_view_counts テーブルの上位10件を表示
SELECT item_name, view_count
FROM item_view_counts
WHERE item_name IS NOT NULL AND item_name != ''
ORDER BY view_count DESC
LIMIT 10;

-- 3. get_trending_items 関数を直接呼び出して確認
SELECT * FROM get_trending_items(10, 0);

-- 4. get_trending_items_count 関数を呼び出して確認
SELECT get_trending_items_count();
