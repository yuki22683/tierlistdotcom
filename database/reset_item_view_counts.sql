-- アイテム詳細画面の閲覧回数を全てクリア

-- 方法1: view_countを0にリセット
UPDATE item_views SET view_count = 0;

-- 方法2: テーブルの全データを削除（完全にクリア）
-- TRUNCATE item_views;

-- 確認: リセット後のデータを確認
SELECT COUNT(*) as total_records,
       SUM(view_count) as total_views
FROM item_views;
