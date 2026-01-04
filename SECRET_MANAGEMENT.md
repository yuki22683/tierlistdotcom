# 鍵情報・証明書・設定ファイル管理ガイド

このプロジェクトで使用されている、定期的な更新や管理が必要な鍵情報、証明書、および設定ファイルについての情報をまとめます。

## 1. Apple Developer 関連 (iOSアプリ配信)

これらのファイルは期限が切れるとアプリのビルドや配布ができなくなります。通常 **1年ごと** の更新が必要です。

| 項目 | ファイルパス / 場所 | 更新・確認方法 | 備考 |
| :--- | :--- | :--- | :--- |
| **Apple 配布用証明書** | `証明書/distribution.cer` | Apple Developer Console で作成・ダウンロード | 有効期限: 1年。期限切れ前に再発行が必要。 |
| **プロビジョニングプロファイル** | `証明書/*.mobileprovision` | Apple Developer Console で生成 | 証明書更新時や、テストデバイス追加時に再発行が必要。 |
| **証明書署名要求 (CSR)** | `証明書/*.certSigningRequest` | キーチェーンアクセス.app で作成 | 新しい証明書を要求する際に使用。 |
| **APNs 認証キー** | `supabase secrets` に設定 | Apple Developer Console で `.p8` を作成 | プッシュ通知用。一度作成すれば基本更新不要だが紛失注意。 |

## 2. 環境変数 (Secrets)

インフラ（Vercel, Supabase）の設定画面で管理されている機密情報です。

### Supabase Edge Functions (シークレット)
`supabase secrets set KEY=VALUE` で設定します。

- `FCM_SERVER_KEY`: Firebase Cloud Messaging 送信用。
- `FIREBASE_SERVICE_ACCOUNT`: FCM V1 API 用の JSON サービスアカウント。
- `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`: iOS プッシュ通知用。

### Web アプリケーション (.env / Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクト URL。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: クライアント用匿名キー。
- `SUPABASE_SERVICE_ROLE_KEY`: **機密。** サーバーサイド特権操作用。
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`: 画像アップロード (Cloudflare Images) 用。

## 3. モバイルアプリ設定ファイル

Firebase 等の外部サービス連携設定です。プロジェクト設定変更時に更新が必要です。

- **Android**: `android/app/google-services.json`
- **iOS**: `ios/App/App/GoogleService-Info.plist`

## 4. コード内にハードコードされている ID

アカウントやリンク先を変更する際に、コードの修正が必要な箇所です。

| 項目 | 修正対象ファイル | 現在の設定値 (参考) |
| :--- | :--- | :--- |
| **楽天アフィリエイトID** | `components/RakutenWidgetList.tsx` | `4bee7433.fc9cdba3.4bee7434.f3fa9fc1` |
| **個別アフィリエイトリンク** | `utils/affiliateLinks.ts` | 各種リンク URL |

---

## メンテナンスチェックリスト

- [ ] **1年ごと**: Apple Distribution Certificate の有効期限を確認し、必要に応じて更新する。
- [ ] **証明書更新時**: 新しいプロビジョニングプロファイルを生成し、`証明書/` ディレクトリ内のファイルを差し替える。
- [ ] **Firebase 設定変更時**: `google-services.json` および `GoogleService-Info.plist` を最新版に更新し、`npm run cap:sync` を実行する。
- [ ] **アカウント変更時**: 楽天アフィリエイト ID などのハードコード箇所を検索し、一括更新する。
