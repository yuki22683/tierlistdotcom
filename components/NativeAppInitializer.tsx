'use client'

import { useEffect } from 'react'
import { isNativeApp } from '@/utils/platform'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App as CapApp } from '@capacitor/app'
import { initializePushNotifications, cleanupPushNotifications } from '@/utils/notifications'
import { useLoading } from '@/context/LoadingContext'

/**
 * ネイティブアプリの初期化処理
 * Webアプリには影響しません
 */
export default function NativeAppInitializer() {
  const { startLoading } = useLoading()

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
        await StatusBar.setBackgroundColor({ color: '#000000' })

        // WebViewをステータスバーの下に配置しない（ステータスバーエリアを確保）
        await StatusBar.setOverlaysWebView({ overlay: false })

        // プッシュ通知の初期化
        console.log('[NativeAppInit] Calling initializePushNotifications...')
        await initializePushNotifications()
        console.log('[NativeAppInit] initializePushNotifications completed')

        // アプリのURLスキームハンドリング（ディープリンク用）
        CapApp.addListener('appUrlOpen', async (event) => {
          console.log('[DeepLink] App opened with URL:', event.url)

          // OAuth認証のコールバック処理
          if (event.url.includes('auth/callback')) {
            // アプリに戻ってきたらすぐにローディングを開始
            startLoading()
            
            try {
              const url = new URL(event.url)

              // Supabaseの認証セッションを設定
              const { createClient } = await import('@/utils/supabase/client')
              const supabase = createClient()

              // URLからcodeパラメータを取得（PKCE flow）
              const code = new URLSearchParams(url.search).get('code')

              if (code) {
                console.log('[DeepLink] Exchanging code for session...')

                // codeをセッショントークンに交換
                const { data, error } = await supabase.auth.exchangeCodeForSession(code)

                if (error) {
                  console.error('[DeepLink] Failed to exchange code:', error)
                  return
                }

                console.log('[DeepLink] Authentication successful')

                // 認証成功フラグをsessionStorageに保存（ページ遷移後も保持）
                sessionStorage.setItem('just-authenticated', 'true')

                // nextパラメータがあればそのページに遷移
                const nextPath = new URLSearchParams(url.search).get('next')
                if (nextPath) {
                  window.location.replace(decodeURIComponent(nextPath))
                } else {
                  window.location.replace('/')
                }
              } else {
                console.error('[DeepLink] No code parameter found in URL')
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
  }, [startLoading])

  // このコンポーネントは何も表示しない
  return null
}
