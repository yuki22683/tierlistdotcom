'use client'

import { PushNotifications } from '@capacitor/push-notifications'
import { isNativeApp } from './platform'

/**
 * プッシュ通知の初期化
 * ネイティブアプリでのみ動作します
 */
export async function initializePushNotifications(): Promise<void> {
  if (!isNativeApp()) {
    console.log('Push notifications are only available in native apps')
    return
  }

  try {
    // 通知の許可をリクエスト
    const permission = await PushNotifications.requestPermissions()

    if (permission.receive === 'granted') {
      // プッシュ通知を登録
      await PushNotifications.register()

      // 登録成功時のリスナー
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token:', token.value)
        // TODO: トークンをサーバーに送信して保存
        // await saveDeviceToken(token.value)
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
        // TODO: 通知の内容に応じてページ遷移など
        // 例: router.push(notification.notification.data.url)
      })

      console.log('Push notifications initialized successfully')
    } else {
      console.log('Push notification permission denied')
    }
  } catch (error) {
    console.error('Failed to initialize push notifications:', error)
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
