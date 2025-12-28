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
    contentInset: 'never',
    backgroundColor: '#000000',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
      iosSpinnerStyle: 'small',
      showSpinner: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    StatusBar: {
      backgroundColor: '#000000',
      style: 'DARK',
    },
  }
};

export default config;
