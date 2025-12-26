# Capacitor モバイルアプリビルド手順

このプロジェクトはCapacitorを使用してiOS/Androidアプリをビルドできます。

## アプリの仕組み

このアプリは**WebView方式**を採用しており、既存のWebサイト（https://tier-lst.com）をネイティブアプリ内で表示します。

### メリット
- Webとモバイルで完全にコードを共有
- Webサイトの更新がアプリにも即座に反映
- ビルドが簡単で静的エクスポート不要
- APIルートやサーバー機能がそのまま使える

## 前提条件

### iOS開発
- macOS
- Xcode（最新版推奨）
- CocoaPods: `sudo gem install cocoapods`

### Android開発
- Android Studio
- Java Development Kit (JDK) 17以上

## セットアップ（初回のみ）

すでにCapacitorの環境構築は完了しています。

```bash
# 依存パッケージのインストール（済み）
npm install

# iOS/Androidプラットフォームの追加（済み）
# npx cap add ios
# npx cap add android
```

## ビルド手順

### 1. Capacitorの同期

```bash
npm run cap:sync
```

このコマンドは設定ファイルをネイティブプロジェクトに同期します。

### 2. ネイティブIDEで開く

#### iOS (Xcode)

```bash
npm run cap:open:ios
```

または

```bash
npx cap open ios
```

Xcodeが開いたら：
1. プロジェクト設定で Bundle Identifier を確認（現在: `com.tierlist.app`）
2. Signing & Capabilities でチームを選択
3. シミュレータまたは実機を選択して実行

#### Android (Android Studio)

```bash
npm run cap:open:android
```

または

```bash
npx cap open android
```

Android Studioが開いたら：
1. Gradleの同期を待つ
2. エミュレータまたは実機を選択して実行

## アプリの設定

### アプリ名とアイコンの変更

#### アプリ名

`capacitor.config.ts`:
```typescript
appName: 'ティアリスト.com',
```

#### iOS
- Xcodeで `ios/App/App/Info.plist` の `CFBundleDisplayName` を編集
- アイコン: `ios/App/App/Assets.xcassets/AppIcon.appiconset/` に画像を配置

#### Android
- `android/app/src/main/res/values/strings.xml` の `app_name` を編集
- アイコン: `android/app/src/main/res/mipmap-*/` に画像を配置

### URLの変更

開発環境とプロダクション環境でURLを切り替えられます。

`capacitor.config.ts`:
```typescript
server: {
  // 本番WebサイトのURL
  url: 'https://tier-lst.com',

  // 開発時はローカルサーバー（コメントアウトを切り替え）
  // url: 'http://localhost:3000',

  cleartext: true,
}
```

開発時は：
1. `npm run dev` でローカルサーバーを起動
2. `capacitor.config.ts` のURLを `http://localhost:3000` に変更
3. `npx cap sync` を実行
4. アプリをビルド

## ストア公開の準備

### iOS App Store

1. **Apple Developer Programへの登録**
   - https://developer.apple.com/programs/

2. **App IDの作成**
   - Bundle Identifier: `com.tierlist.app`

3. **アプリアイコンとスクリーンショット**
   - 必要なサイズのアイコンを用意
   - 各デバイスサイズのスクリーンショット

4. **Xcodeでアーカイブ**
   - Product > Archive
   - Distribute App > App Store Connect

5. **App Store Connectで申請**
   - アプリ情報、スクリーンショット、説明文を登録
   - 審査に提出

### Google Play Store

1. **Google Play Developer アカウントの登録**
   - https://play.google.com/console/

2. **キーストアの作成**
   ```bash
   keytool -genkey -v -keystore tierlist-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tierlist
   ```

3. **署名設定**
   - `android/app/build.gradle` に署名設定を追加
   - `android/gradle.properties` にキーストア情報を追加

4. **リリースビルド**
   - Android Studio で Build > Generate Signed Bundle / APK
   - AAB形式を選択

5. **Google Play Consoleで申請**
   - アプリ情報、スクリーンショット、説明文を登録
   - 内部テスト → クローズドテスト → 本番公開

## プライバシー設定

### iOS

必要に応じて `ios/App/App/Info.plist` にプライバシー権限を追加：

```xml
<key>NSCameraUsageDescription</key>
<string>写真撮影のためにカメラを使用します</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>画像選択のためにフォトライブラリを使用します</string>
```

### Android

`android/app/src/main/AndroidManifest.xml` に権限を追加：

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## トラブルシューティング

### アプリが真っ白になる

- URLが正しいか確認
- ネットワーク接続を確認
- `capacitor.config.ts` の `server.cleartext` が `true` か確認

### iOSでCocoaPodsエラー

```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### Androidでビルドエラー

1. Android Studioで「File > Invalidate Caches / Restart」
2. `android` フォルダを削除して再度追加
   ```bash
   npx cap add android
   npx cap sync
   ```

### ローカル開発時の接続エラー

- iOSシミュレータ: `http://localhost:3000` が使える
- Androidエミュレータ: `http://10.0.2.2:3000` を使用
- 実機: MacのIPアドレス `http://192.168.x.x:3000` を使用

## ディレクトリ構造

```
tierlistdotcom/
├── capacitor.config.ts  # Capacitor設定（URLを指定）
├── public/              # 最小限のHTMLファイル
│   └── index.html       # リダイレクト用
├── ios/                 # iOSネイティブプロジェクト
│   └── App/
│       └── App/
│           ├── Assets.xcassets/  # アイコン
│           └── Info.plist        # アプリ設定
├── android/             # Androidネイティブプロジェクト
│   └── app/
│       └── src/
│           └── main/
│               ├── res/          # アイコンとリソース
│               └── AndroidManifest.xml  # アプリ設定
└── ...
```

## 参考リンク

- [Capacitor公式ドキュメント](https://capacitorjs.com/docs)
- [Capacitor iOS開発](https://capacitorjs.com/docs/ios)
- [Capacitor Android開発](https://capacitorjs.com/docs/android)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)
