-- プッシュ通知機能のためのテーブル作成
-- 実行方法: Supabase Dashboard > SQL Editor で実行

-- 1. デバイストークンテーブル
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

-- 2. 通知履歴テーブル
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_list_id UUID NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier_list_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_history_tier_list ON notification_history(tier_list_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type);

-- RLS の設定
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- ポリシー設定（既存のポリシーがあれば削除してから作成）
DROP POLICY IF EXISTS "Users can insert their own device tokens" ON device_tokens;
CREATE POLICY "Users can insert their own device tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own device tokens" ON device_tokens;
CREATE POLICY "Users can view their own device tokens"
  ON device_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own device tokens" ON device_tokens;
CREATE POLICY "Users can update their own device tokens"
  ON device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own device tokens" ON device_tokens;
CREATE POLICY "Users can delete their own device tokens"
  ON device_tokens FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view notification history" ON notification_history;
CREATE POLICY "Users can view notification history"
  ON notification_history FOR SELECT
  USING (true);
