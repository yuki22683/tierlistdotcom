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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase URL or Anon Key is not set')
      return
    }

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

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Edge Function error: ${error.error || response.statusText}`)
    }

    const result = await response.json()
    console.log(`✅ Push notification sent via Edge Function:`, result)

  } catch (error) {
    console.error(`❌ Failed to send push notification:`, error)

    // エラーが発生してもアプリの動作は継続（通知送信の失敗がユーザー操作に影響しない）
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`)
    }
  }
}
