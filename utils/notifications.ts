'use client'

import { PushNotifications } from '@capacitor/push-notifications'
import { isNativeApp } from './platform'
import { createClient } from '@/utils/supabase/client'
import { Capacitor } from '@capacitor/core'

// FCMトークンをグローバルに保持（ログイン前に取得された場合に備える）
let pendingDeviceToken: string | null = null

/**
 * プッシュ通知の初期化
 * ネイティブアプリでのみ動作します
 */
export async function initializePushNotifications(): Promise<void> {
  console.log('[Push] Initializing push notifications...')
  console.log('[Push] isNativeApp:', isNativeApp())
  console.log('[Push] Platform:', Capacitor.getPlatform())

  if (!isNativeApp()) {
    console.log('[Push] Push notifications are only available in native apps')
    return
  }

  console.log('[Push] Native app detected, requesting permissions...')

  try {
    // リスナーを先に登録（register()を呼ぶ前に）
    console.log('[Push] Setting up listeners...')

    // 登録成功時のリスナー
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Push registration success, token:', token.value)
      pendingDeviceToken = token.value // トークンを保持
      // トークンをサーバーに送信して保存
      await saveDeviceToken(token.value)
    })

    // 登録失敗時のリスナー
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Push registration error:', error)
    })

    // ログイン状態の変更を監視
    const supabase = createClient()
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Push] Auth state changed:', event)

      // INITIAL_SESSIONでもセッションとユーザーが存在する場合はトークンを保存
      if (event === 'INITIAL_SESSION' && session?.user && pendingDeviceToken) {
        console.log('[Push] Initial session detected with user, saving pending device token...')
        await saveDeviceTokenDirectly(pendingDeviceToken, session.user.id)
      }

      // ログイン時に保留中のトークンを保存（sessionから直接ユーザー情報を取得）
      if (event === 'SIGNED_IN' && pendingDeviceToken) {
        console.log('[Push] User signed in, saving pending device token...')

        if (session?.user) {
          console.log('[Push] User data available from session, saving device token...')
          await saveDeviceTokenDirectly(pendingDeviceToken, session.user.id)
        } else {
          console.error('[Push] ❌ User data not available in session after SIGNED_IN event')
        }
      }

      // ログアウト時はトークンをクリア（オプション）
      if (event === 'SIGNED_OUT') {
        console.log('[Push] User signed out')
        pendingDeviceToken = null
      }
    })

    // 通知受信時のリスナー（アプリがフォアグラウンドの場合）
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Push notification received:', notification)
      // TODO: アプリ内で通知を表示
    })

    // 通知タップ時のリスナー
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[Push] Push notification action performed:', notification)

      // 通知データからティアリストIDを取得してページ遷移
      const tierListId = notification.notification.data?.tierListId
      if (tierListId) {
        window.location.href = `/tier-lists/${tierListId}`
      }
    })

    // 通知の許可をリクエスト
    console.log('[Push] Calling requestPermissions...')
    const permission = await PushNotifications.requestPermissions()
    console.log('[Push] Permission result:', permission)

    if (permission.receive === 'granted') {
      // プッシュ通知を登録
      console.log('[Push] Registering for push notifications...')
      await PushNotifications.register()

      console.log('[Push] Push notifications initialized successfully')
    } else {
      console.log('[Push] Push notification permission denied:', permission)
    }
  } catch (error) {
    console.error('[Push] Failed to initialize push notifications:', error)
    console.error('[Push] Error details:', JSON.stringify(error))
  }
}

/**
 * プッシュ通知のクリーンアップ
 */
export function cleanupPushNotifications(): void {
  if (isNativeApp()) {
    PushNotifications.removeAllListeners()
  }
}

/**
 * ユーザーIDを直接指定してデバイストークンを保存
 *
 * @param token - プッシュ通知用のデバイストークン
 * @param userId - ユーザーID
 */
async function saveDeviceTokenDirectly(token: string, userId: string): Promise<void> {
  try {
    console.log('[Push] saveDeviceTokenDirectly called')
    const supabase = createClient()
    console.log('[Push] Supabase client created')

    // プラットフォーム判定（ios, android, web）
    const platform = Capacitor.getPlatform()

    console.log('[Push] Attempting to save device token...')
    console.log('[Push] User ID:', userId)
    console.log('[Push] Platform:', platform)
    console.log('[Push] Token (first 20 chars):', token.substring(0, 20) + '...')

    console.log('[Push] Calling supabase.from(device_tokens).upsert()...')

    // タイムアウト付きでupsertを実行
    const upsertPromise = supabase
      .from('device_tokens')
      .upsert({
        user_id: userId,
        token: token,
        platform: platform,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'token'  // 同じトークンが別のユーザーに紐づいていた場合、現在のユーザーに上書き
      })

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Upsert timeout after 10 seconds')), 10000)
    )

    const { error } = await Promise.race([upsertPromise, timeoutPromise]) as any

    console.log('[Push] Upsert completed, checking error...')
    if (error) {
      console.error('[Push] ❌ Failed to save device token:', error)
      console.error('[Push] Error details:', JSON.stringify(error))
    } else {
      console.log('[Push] ✅ Device token saved successfully to database')

      // 保存確認のためにデータベースから読み取り
      console.log('[Push] Verifying saved token...')
      const { data: savedToken, error: fetchError } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('token', token)
        .single()

      if (fetchError) {
        console.error('[Push] ❌ Failed to verify saved token:', fetchError)
      } else {
        console.log('[Push] ✅ Token verified in database:', savedToken)
      }
    }
    console.log('[Push] saveDeviceTokenDirectly completed')
  } catch (error) {
    console.error('[Push] ❌ Exception in saveDeviceTokenDirectly:', error)
    if (error instanceof Error) {
      console.error('[Push] Error message:', error.message)
      console.error('[Push] Error stack:', error.stack)
    }
  }
}

/**
 * デバイストークンをサーバーに保存
 * アカウント切り替え時も正しく動作するように、tokenをUNIQUEキーとしてUPSERT
 *
 * @param token - プッシュ通知用のデバイストークン
 */
async function saveDeviceToken(token: string): Promise<void> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[Push] User not logged in, skipping device token save')
    console.log('[Push] Pending token will be saved after login:', token.substring(0, 20) + '...')
    return
  }

  await saveDeviceTokenDirectly(token, user.id)
}
