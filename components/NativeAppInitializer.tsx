'use client'

import { useEffect } from 'react'
import { isNativeApp } from '@/utils/platform'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App as CapApp } from '@capacitor/app'
import { initializePushNotifications, cleanupPushNotifications } from '@/utils/notifications'

/**
 * ネイティブアプリの初期化処理
 * Webアプリには影響しません
 */
export default function NativeAppInitializer() {
  useEffect(() => {
    console.log('[NativeAppInit] useEffect triggered')
    console.log('[NativeAppInit] isNativeApp:', isNativeApp())

    // ネイティブアプリの場合のみ実行
    if (!isNativeApp()) {
      console.log('[NativeAppInit] Not a native app, skipping initialization')
      return
    }

    const initializeNativeFeatures = async () => {
      try {
        console.log('[NativeAppInit] Starting native features initialization...')

        // スプラッシュスクリーンを非表示
        await SplashScreen.hide()

        // ステータスバーの設定
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#ffffff' })

        // プッシュ通知の初期化
        console.log('[NativeAppInit] Calling initializePushNotifications...')
        await initializePushNotifications()
        console.log('[NativeAppInit] initializePushNotifications completed')

        // アプリのURLスキームハンドリング（ディープリンク用）
        CapApp.addListener('appUrlOpen', (event) => {
          // ディープリンクの処理（必要に応じて実装）
          console.log('App opened with URL:', event.url)
        })

        // アプリがバックグラウンドから復帰した時の処理
        CapApp.addListener('appStateChange', (state) => {
          if (state.isActive) {
            console.log('App became active')
            // 必要に応じてデータの再取得など
          }
        })

        console.log('Native app features initialized')
      } catch (error) {
        console.error('Failed to initialize native features:', error)
      }
    }

    initializeNativeFeatures()

    // クリーンアップ
    return () => {
      if (isNativeApp()) {
        CapApp.removeAllListeners()
        cleanupPushNotifications()
      }
    }
  }, [])

  // このコンポーネントは何も表示しない
  return null
}
