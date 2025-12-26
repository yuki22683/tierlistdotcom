import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tierlist.app',
  appName: 'ティアリスト.com',
  webDir: 'public',
  server: {
    // 本番WebサイトのURLを指定（開発時はコメントアウト）
    url: 'https://tier-lst.com',
    cleartext: true,
    // 開発時はローカルサーバーを指定
    // url: 'http://localhost:3000',
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  }
};

export default config;
