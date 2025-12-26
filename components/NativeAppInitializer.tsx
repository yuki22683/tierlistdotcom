'use client'

import { useEffect } from 'react'
import { isNativeApp } from '@/utils/platform'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App as CapApp } from '@capacitor/app'

/**
 * ネイティブアプリの初期化処理
 * Webアプリには影響しません
 */
export default function NativeAppInitializer() {
  useEffect(() => {
    // ネイティブアプリの場合のみ実行
    if (!isNativeApp()) return

    const initializeNativeFeatures = async () => {
      try {
        // スプラッシュスクリーンを非表示
        await SplashScreen.hide()

        // ステータスバーの設定
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#ffffff' })

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
      }
    }
  }, [])

  // このコンポーネントは何も表示しない
  return null
}
