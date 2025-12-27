// Supabase Edge Function: プッシュ通知送信 (FCM V1 API対応)
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
    const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    console.log('[EdgeFunction] Environment variables check:')
    console.log('[EdgeFunction]   FIREBASE_SERVICE_ACCOUNT:', FIREBASE_SERVICE_ACCOUNT ? '✅ Set' : '❌ Not set')
    console.log('[EdgeFunction]   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Not set')
    console.log('[EdgeFunction]   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set')

    if (!FIREBASE_SERVICE_ACCOUNT) {
      console.error('[EdgeFunction] ❌ FIREBASE_SERVICE_ACCOUNT is not set')
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
    }

    // Firebase Service Accountをパース
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)
    console.log('[EdgeFunction] Firebase project_id:', serviceAccount.project_id)

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
          // iOS: FCM経由でも送信可能
          return await sendFCMV1Notification(
            deviceToken.token,
            title,
            body,
            data || {},
            serviceAccount
          )
        } else {
          // Android: FCM V1 API経由
          return await sendFCMV1Notification(
            deviceToken.token,
            title,
            body,
            data || {},
            serviceAccount
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
 * FCM V1 API経由でプッシュ通知を送信
 */
async function sendFCMV1Notification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  serviceAccount: any
): Promise<{ success: boolean; platform: string; error?: string }> {
  console.log('[FCM V1] Starting FCM notification send...')
  console.log('[FCM V1] Token (first 20 chars):', token.substring(0, 20) + '...')
  console.log('[FCM V1] Title:', title)
  console.log('[FCM V1] Body:', body)
  console.log('[FCM V1] Data:', data)

  try {
    // OAuth 2.0 アクセストークンを取得
    const accessToken = await getAccessToken(serviceAccount)
    console.log('[FCM V1] Access token obtained:', accessToken.substring(0, 20) + '...')

    // FCM V1 APIのペイロード
    const payload = {
      message: {
        token: token,
        notification: {
          title: title,
          body: body,
        },
        data: data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            }
          }
        }
      }
    }

    console.log('[FCM V1] Sending request to FCM V1 API...')
    console.log('[FCM V1] Payload:', JSON.stringify(payload, null, 2))

    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
    console.log('[FCM V1] FCM URL:', fcmUrl)

    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('[FCM V1] FCM response status:', response.status)

    const responseText = await response.text()
    console.log('[FCM V1] FCM response body (raw):', responseText.substring(0, 500))

    // JSONとしてパース
    let result
    try {
      result = JSON.parse(responseText)
      console.log('[FCM V1] FCM response body (parsed):', JSON.stringify(result, null, 2))
    } catch (e) {
      console.error('[FCM V1] ❌ Failed to parse FCM response as JSON:', e.message)
      return {
        success: false,
        platform: 'android',
        error: `Invalid FCM response: ${responseText.substring(0, 100)}`
      }
    }

    if (response.ok) {
      console.log(`[FCM V1] ✅ FCM notification sent successfully to ${token.substring(0, 20)}...`)
      return { success: true, platform: 'android' }
    } else {
      console.error(`[FCM V1] ❌ FCM notification failed:`, result)
      return {
        success: false,
        platform: 'android',
        error: result.error?.message || 'Unknown FCM error'
      }
    }
  } catch (error) {
    console.error(`[FCM V1] ❌ FCM request failed:`, error)
    return {
      success: false,
      platform: 'android',
      error: error.message
    }
  }
}

/**
 * Firebase Service AccountからOAuth 2.0アクセストークンを取得
 */
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  // JWT Header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  // JWT Claim Set
  const claimSet = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  // Base64url encode
  const base64UrlEncode = (obj: any) => {
    const json = JSON.stringify(obj)
    const base64 = btoa(json)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const encodedHeader = base64UrlEncode(header)
  const encodedClaimSet = base64UrlEncode(claimSet)
  const message = `${encodedHeader}.${encodedClaimSet}`

  // Private Keyから署名を生成
  const privateKeyPem = serviceAccount.private_key
  const signature = await signJWT(message, privateKeyPem)

  const jwt = `${message}.${signature}`

  // アクセストークンを取得
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok) {
    console.error('[OAuth] ❌ Failed to get access token:', tokenData)
    throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error}`)
  }

  return tokenData.access_token
}

/**
 * RS256でJWTに署名
 */
async function signJWT(message: string, privateKeyPem: string): Promise<string> {
  // PEM形式の秘密鍵をパース
  const pemHeader = '-----BEGIN PRIVATE KEY-----'
  const pemFooter = '-----END PRIVATE KEY-----'
  const pemContents = privateKeyPem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '')

  // Base64デコード
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  // CryptoKeyをインポート
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  // 署名を生成
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    data
  )

  // Base64url encode
  const signatureArray = new Uint8Array(signatureBuffer)
  const base64 = btoa(String.fromCharCode(...signatureArray))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
