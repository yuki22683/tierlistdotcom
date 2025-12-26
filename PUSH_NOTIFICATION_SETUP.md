# プッシュ通知機能 セットアップ手順（Supabase版）

このドキュメントでは、**Supabase Edge Functions** を使ってプッシュ通知を実装する手順を説明します。

## 📋 実装済みの機能

✅ コメント通知 - 自分のティアリストにコメントが付いた時に通知
✅ 投票結果通知 - 投票数が10, 50, 100, 500, 1000件に達した時に通知
✅ デバイストークン管理 - アカウント切り替えにも対応
✅ 通知タップ時のページ遷移 - ティアリスト詳細ページを自動で開く
✅ **Supabaseで統一** - Firebase Admin SDK不要

## 🏗️ アーキテクチャ

```
コメント投稿/投票
  ↓
Next.js Server Action
  ↓
Supabase Edge Function (send-push-notification)
  ↓
FCM HTTP API
  ↓
iOS/Android デバイス
```

---

## 🔧 セットアップ手順

### ステップ1: データベースの設定

Supabase Dashboard にアクセスし、SQLエディタで以下のファイルを実行してください：

```bash
database/push_notifications_setup.sql
```

これにより以下のテーブルが作成されます：
- `device_tokens` - デバイストークンを保存
- `notification_history` - 通知履歴を保存（重複送信防止）

---

### ステップ2: Firebase Cloud Messaging (FCM) のセットアップ

#### 2-1. Firebaseプロジェクトの作成（既存のプロジェクトでもOK）

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 既存のプロジェクトを選択 または 新規プロジェクトを作成

#### 2-2. iOSアプリの登録

1. Firebaseプロジェクトのダッシュボードで「アプリを追加」→ iOS を選択
2. iOS Bundle ID を入力: `com.tierlist.app`
3. `GoogleService-Info.plist` をダウンロード
4. ダウンロードしたファイルを `ios/App/App/` にコピー

#### 2-3. Androidアプリの登録

1. Firebaseプロジェクトのダッシュボードで「アプリを追加」→ Android を選択
2. Android パッケージ名を入力: `com.tierlist.app`
3. `google-services.json` をダウンロード
4. ダウンロードしたファイルを `android/app/` にコピー

#### 2-4. FCM Server Key の取得

1. Firebaseコンソールで「プロジェクトの設定」→「Cloud Messaging」タブ
2. **Server key** をコピー（長い文字列）
   - 例: `AAAA1234567890abcdefghijklmnopqrstuvwxyz...`

**重要:** この Server Key は次のステップで使用します。

---

### ステップ3: Supabase Edge Function のデプロイ

#### 3-1. Supabase CLI のインストール

```bash
# macOS
brew install supabase/tap/supabase

# その他のOS
npm install -g supabase
```

#### 3-2. Supabase プロジェクトにログイン

```bash
supabase login
```

#### 3-3. プロジェクトをリンク

```bash
# プロジェクトのルートディレクトリで実行
supabase link --project-ref <YOUR_PROJECT_REF>
```

**YOUR_PROJECT_REF の確認方法:**
- Supabase Dashboard のURLから取得: `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>`

#### 3-4. Edge Function に環境変数を設定

```bash
# FCM Server Key を設定
supabase secrets set FCM_SERVER_KEY=AAAA1234567890abcdefghijklmnopqrstuvwxyz...
```

**オプション: iOS用のAPNs設定（将来的に追加する場合）**
```bash
supabase secrets set APNS_KEY_ID=your-apns-key-id
supabase secrets set APNS_TEAM_ID=your-team-id
supabase secrets set APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

#### 3-5. Edge Function をデプロイ

```bash
supabase functions deploy send-push-notification
```

成功すると以下のようなメッセージが表示されます：
```
Deployed Function send-push-notification on project <YOUR_PROJECT>
URL: https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/send-push-notification
```

---

### ステップ4: Capacitor Sync

```bash
npm run cap:sync
```

---

### ステップ5: 動作確認

#### iOSでテスト

```bash
npm run cap:open:ios
```

1. Xcodeでアプリをビルド・実行
2. 通知許可のダイアログで「許可」を選択
3. 別のアカウントで自分のティアリストにコメント投稿
4. 通知が届くことを確認

#### Androidでテスト

```bash
npm run cap:open:android
```

1. Android Studioでアプリをビルド・実行
2. 通知許可のダイアログで「許可」を選択
3. 別のアカウントで自分のティアリストにコメント投稿
4. 通知が届くことを確認

---

## 🐛 トラブルシューティング

### 通知が届かない場合

#### 1. デバイストークンが保存されているか確認

Supabase Dashboard → Table Editor → `device_tokens`

```sql
SELECT * FROM device_tokens;
```

ユーザーIDとトークンが保存されているか確認

#### 2. Edge Function のログを確認

Supabase Dashboard → Edge Functions → `send-push-notification` → Logs

エラーメッセージがないか確認

#### 3. FCM Server Key が正しく設定されているか確認

```bash
supabase secrets list
```

`FCM_SERVER_KEY` が表示されることを確認

#### 4. Edge Function を手動でテスト

```bash
curl -X POST \
  'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer <YOUR_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "<USER_ID>",
    "title": "テスト通知",
    "body": "これはテストメッセージです",
    "data": {}
  }'
```

レスポンスを確認してエラーがないかチェック

---

## 📊 通知の仕様

### コメント通知

- **トリガー**: 自分のティアリストにコメントが投稿された時
- **除外条件**: 自分が自分のティアリストにコメントした場合
- **通知内容**:
  ```
  タイトル: 「ティアリスト名」に新しいコメント
  本文: コメント投稿者名: コメント内容（50文字まで）
  ```

### 投票結果通知

- **トリガー**: 投票数が 10, 50, 100, 500, 1000件 に達した時
- **送信ルール**: 各節目で1回のみ送信（重複なし）
- **通知内容**:
  ```
  タイトル: 🔥 投票が{件数}件に達しました！
  本文: 「ティアリスト名」が人気です
  ```

---

## 🔒 セキュリティ

### Row Level Security (RLS)

`device_tokens` テーブルには RLS が設定されており、ユーザーは自分のトークンのみ操作できます。

Edge Function は **Service Role Key** を使用してRLSをバイパスし、全ユーザーのトークンにアクセスできます。

### 環境変数の保護

- `FCM_SERVER_KEY` は Supabase Secrets に保存され、暗号化されています
- Edge Function の環境変数はクライアント側に公開されません

---

## 💰 コスト

### Supabase Edge Functions

- **無料枠**: 月50万リクエストまで無料
- **超過料金**: 100万リクエストあたり $2

ティアリストのコメント/投票通知程度であれば、無料枠で十分カバーできます。

### FCM（Firebase Cloud Messaging）

- **完全無料**: 無制限の通知送信が可能

---

## 🔄 メンテナンス

### Edge Function の更新

コードを修正した後、再デプロイ：

```bash
supabase functions deploy send-push-notification
```

### ログの確認

```bash
supabase functions logs send-push-notification
```

### 古いデバイストークンの削除

60日以上更新されていないトークンを削除：

```sql
DELETE FROM device_tokens WHERE updated_at < NOW() - INTERVAL '60 days';
```

---

## ✅ 完了チェックリスト

- [ ] データベーステーブル作成完了（device_tokens, notification_history）
- [ ] Firebase プロジェクト作成完了（既存でもOK）
- [ ] iOS アプリ登録完了（GoogleService-Info.plist 配置済み）
- [ ] Android アプリ登録完了（google-services.json 配置済み）
- [ ] FCM Server Key 取得完了
- [ ] Supabase CLI インストール完了
- [ ] Supabase プロジェクトリンク完了
- [ ] FCM_SERVER_KEY を Supabase Secrets に設定完了
- [ ] Edge Function デプロイ完了
- [ ] `npm run cap:sync` 実行完了
- [ ] iOS/Androidで通知の動作確認完了

---

## 📚 参考リンク

- [Supabase Edge Functions ドキュメント](https://supabase.com/docs/guides/functions)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)

---

問題が発生した場合は、Supabase Dashboard の Edge Function ログを確認してください。
