'use client'

import { PushNotifications } from '@capacitor/push-notifications'
import { isNativeApp } from './platform'
import { createClient } from '@/utils/supabase/client'
import { Capacitor } from '@capacitor/core'

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
    // 通知の許可をリクエスト
    console.log('[Push] Calling requestPermissions...')
    const permission = await PushNotifications.requestPermissions()
    console.log('[Push] Permission result:', permission)

    if (permission.receive === 'granted') {
      // プッシュ通知を登録
      await PushNotifications.register()

      // 登録成功時のリスナー
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token:', token.value)
        // トークンをサーバーに送信して保存
        await saveDeviceToken(token.value)
      })

      // 登録失敗時のリスナー
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error)
      })

      // 通知受信時のリスナー（アプリがフォアグラウンドの場合）
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification)
        // TODO: アプリ内で通知を表示
      })

      // 通知タップ時のリスナー
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification)

        // 通知データからティアリストIDを取得してページ遷移
        const tierListId = notification.notification.data?.tierListId
        if (tierListId) {
          window.location.href = `/tier-lists/${tierListId}`
        }
      })

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
 * デバイストークンをサーバーに保存
 * アカウント切り替え時も正しく動作するように、tokenをUNIQUEキーとしてUPSERT
 *
 * @param token - プッシュ通知用のデバイストークン
 */
async function saveDeviceToken(token: string): Promise<void> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('User not logged in, skipping device token save')
    return
  }

  // プラットフォーム判定（ios, android, web）
  const platform = Capacitor.getPlatform()

  const { error } = await supabase
    .from('device_tokens')
    .upsert({
      user_id: user.id,
      token: token,
      platform: platform,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'token'  // 同じトークンが別のユーザーに紐づいていた場合、現在のユーザーに上書き
    })

  if (error) {
    console.error('Failed to save device token:', error)
  } else {
    console.log('✅ Device token saved successfully')
  }
}
