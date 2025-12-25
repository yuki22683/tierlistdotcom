'use server'

import { createClient } from '@/utils/supabase/server'

export async function submitInquiry(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const content = formData.get('content') as string

  if (!email || !content) {
    return { error: '全ての項目を入力してください。' }
  }

  // Email validation (simple regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: '有効なメールアドレスを入力してください。' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('inquiries').insert({
    user_id: user?.id || null,
    email,
    content,
    status: 'pending'
  })

  if (error) {
    console.error('Error submitting inquiry:', error)
    return { error: '送信に失敗しました。しばらく経ってから再度お試しください。' }
  }

  return { success: true, message: 'お問い合わせを受け付けました。' }
}
