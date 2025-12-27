interface PushNotificationPayload {
  title: string
  body: string
  data?: Record<string, any>
}

/**
 * 特定ユーザーにプッシュ通知を送信（Supabase Edge Function経由）
 *
 * @param userId - ティアリスト.comのユーザーID
 * @param payload - 通知の内容
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    console.log('[PushUtil] Starting push notification send to user:', userId)
    console.log('[PushUtil] Payload:', payload)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[PushUtil] ❌ Supabase URL or Anon Key is not set')
      return
    }

    console.log('[PushUtil] Calling Edge Function:', `${supabaseUrl}/functions/v1/send-push-notification`)

    // Supabase Edge Function を呼び出し
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title: payload.title,
        body: payload.body,
        data: payload.data || {}
      }),
    })

    console.log('[PushUtil] Edge Function response status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.error('[PushUtil] ❌ Edge Function error response:', error)
      throw new Error(`Edge Function error: ${error.error || response.statusText}`)
    }

    const result = await response.json()
    console.log('[PushUtil] ✅ Push notification sent via Edge Function:', result)

  } catch (error) {
    console.error('[PushUtil] ❌ Failed to send push notification:', error)

    // エラーが発生してもアプリの動作は継続（通知送信の失敗がユーザー操作に影響しない）
    if (error instanceof Error) {
      console.error('[PushUtil]    Error message:', error.message)
      console.error('[PushUtil]    Error stack:', error.stack)
    }
  }
}
