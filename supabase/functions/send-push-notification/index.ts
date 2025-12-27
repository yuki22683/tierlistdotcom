// Supabase Edge Function: プッシュ通知送信
// Deploy: supabase functions deploy send-push-notification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushNotificationRequest {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
}

serve(async (req) => {
  console.log('[EdgeFunction] ===== Push Notification Request Started =====')
  console.log('[EdgeFunction] Request method:', req.method)

  // CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log('[EdgeFunction] CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数の確認
    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')
    const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID')
    const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID')
    const APNS_PRIVATE_KEY = Deno.env.get('APNS_PRIVATE_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    console.log('[EdgeFunction] Environment variables check:')
    console.log('[EdgeFunction]   FCM_SERVER_KEY:', FCM_SERVER_KEY ? '✅ Set' : '❌ Not set')
    console.log('[EdgeFunction]   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Not set')
    console.log('[EdgeFunction]   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set')

    if (!FCM_SERVER_KEY) {
      console.error('[EdgeFunction] ❌ FCM_SERVER_KEY is not set')
      throw new Error('FCM_SERVER_KEY is not set')
    }

    // リクエストボディの解析
    const { userId, title, body, data }: PushNotificationRequest = await req.json()

    console.log('[EdgeFunction] Request payload:')
    console.log('[EdgeFunction]   userId:', userId)
    console.log('[EdgeFunction]   title:', title)
    console.log('[EdgeFunction]   body:', body)
    console.log('[EdgeFunction]   data:', data)

    if (!userId || !title || !body) {
      console.error('[EdgeFunction] ❌ Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase クライアントの作成（Service Role Key使用）
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    console.log('[EdgeFunction] Fetching device tokens for user:', userId)

    // ユーザーのデバイストークンを取得
    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', userId)

    if (tokenError) {
      console.error('[EdgeFunction] ❌ Failed to fetch device tokens:', tokenError)
      throw new Error(`Failed to fetch device tokens: ${tokenError.message}`)
    }

    console.log('[EdgeFunction] Device tokens found:', tokens?.length || 0)
    if (tokens && tokens.length > 0) {
      tokens.forEach((t, i) => {
        console.log(`[EdgeFunction]   Token ${i + 1}: platform=${t.platform}, token=${t.token.substring(0, 20)}...`)
      })
    }

    if (!tokens || tokens.length === 0) {
      console.log('[EdgeFunction] ⚠️ No device tokens found for user', userId)
      return new Response(
        JSON.stringify({ success: true, message: 'No devices to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[EdgeFunction] Sending push notification to ${tokens.length} device(s) for user ${userId}`)

    // 各デバイスに通知送信
    const results = await Promise.allSettled(
      tokens.map(async (deviceToken) => {
        if (deviceToken.platform === 'ios') {
          // iOS: APNs経由（実装は後述）
          if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_PRIVATE_KEY) {
            console.log('APNs credentials not set, skipping iOS notification')
            return { success: false, platform: 'ios', reason: 'APNs not configured' }
          }
          // TODO: APNs実装（オプション）
          return { success: false, platform: 'ios', reason: 'APNs not implemented yet' }
        } else {
          // Android: FCM経由
          return await sendFCMNotification(
            deviceToken.token,
            title,
            body,
            data || {},
            FCM_SERVER_KEY
          )
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    console.log(`Push notification results: ${successful} successful, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        totalDevices: tokens.length,
        successful,
        failed,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * FCM (Firebase Cloud Messaging) 経由でプッシュ通知を送信
 */
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  serverKey: string
): Promise<{ success: boolean; platform: string; error?: string }> {
  console.log('[FCM] Starting FCM notification send...')
  console.log('[FCM] Token (first 20 chars):', token.substring(0, 20) + '...')
  console.log('[FCM] Title:', title)
  console.log('[FCM] Body:', body)
  console.log('[FCM] Data:', data)

  try {
    const payload = {
      to: token,
      notification: {
        title,
        body,
        sound: 'default',
      },
      data,
      priority: 'high',
    }

    console.log('[FCM] Sending request to FCM...')
    console.log('[FCM] Payload:', JSON.stringify(payload, null, 2))

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('[FCM] FCM response status:', response.status)

    const result = await response.json()
    console.log('[FCM] FCM response body:', JSON.stringify(result, null, 2))

    if (response.ok && result.success === 1) {
      console.log(`[FCM] ✅ FCM notification sent successfully to ${token.substring(0, 20)}...`)
      return { success: true, platform: 'android' }
    } else {
      console.error(`[FCM] ❌ FCM notification failed:`, result)
      return {
        success: false,
        platform: 'android',
        error: result.results?.[0]?.error || 'Unknown FCM error'
      }
    }
  } catch (error) {
    console.error(`[FCM] ❌ FCM request failed:`, error)
    return {
      success: false,
      platform: 'android',
      error: error.message
    }
  }
}

/**
 * APNs (Apple Push Notification service) 経由でプッシュ通知を送信
 * 注: APNsはJWT認証が必要で実装が複雑なため、オプションとして提供
 */
async function sendAPNsNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  keyId: string,
  teamId: string,
  privateKey: string
): Promise<{ success: boolean; platform: string; error?: string }> {
  // TODO: JWT生成とAPNs HTTP/2 APIの実装
  // 現時点ではスキップ（FCMはiOSもサポート可能）
  return {
    success: false,
    platform: 'ios',
    error: 'APNs implementation pending'
  }
}
