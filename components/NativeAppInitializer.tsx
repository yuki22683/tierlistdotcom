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
        CapApp.addListener('appUrlOpen', async (event) => {
          console.log('[DeepLink] App opened with URL:', event.url)

          // OAuth認証のコールバック処理
          if (event.url.includes('auth/callback')) {
            try {
              const url = new URL(event.url)
              const params = new URLSearchParams(url.hash.substring(1)) // #の後のパラメータを取得

              // Supabaseの認証セッションを設定
              const { createClient } = await import('@/utils/supabase/client')
              const supabase = createClient()

              // URLからアクセストークンとリフレッシュトークンを取得
              const access_token = params.get('access_token')
              const refresh_token = params.get('refresh_token')

              if (access_token && refresh_token) {
                await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                })
                console.log('[DeepLink] Authentication successful')

                // nextパラメータがあればそのページに遷移
                const nextPath = new URLSearchParams(url.search).get('next')
                if (nextPath) {
                  window.location.href = nextPath
                } else {
                  window.location.href = '/'
                }
              }
            } catch (error) {
              console.error('[DeepLink] Failed to handle OAuth callback:', error)
            }
          }
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
