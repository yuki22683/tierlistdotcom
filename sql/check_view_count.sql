-- 1. Check if view_count column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tier_lists' AND column_name = 'view_count';

-- 2. Check if get_related_tier_lists function exists
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_related_tier_lists';

-- 3. Test the function manually
SELECT * FROM get_related_tier_lists(
  (SELECT id FROM tier_lists LIMIT 1),
  5
);
