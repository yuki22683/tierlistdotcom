-- 既存のビューカウント関連のテーブルと関数を確認

-- 1. item_views テーブルを確認
SELECT COUNT(*) as total_records FROM item_views;

-- 2. item_views テーブルの上位10件を表示
SELECT name, view_count
FROM item_views
WHERE name IS NOT NULL AND name != ''
ORDER BY view_count DESC
LIMIT 10;

-- 3. increment_item_view 関数の定義を確認
-- Supabase Dashboard > Database > Functions で確認

-- 4. テーブル一覧を確認（item で始まるテーブル）
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'item%'
ORDER BY tablename;
