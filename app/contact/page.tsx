'use client'

import { useActionState } from 'react'
import { submitInquiry } from '@/app/actions/inquiries'
import { useEffect, useRef } from 'react'

const initialState = {
  message: '',
  error: '',
  success: false
}

export default function ContactPage() {
  const [state, formAction, isPending] = useActionState(submitInquiry, initialState as any)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success && formRef.current) {
        formRef.current.reset()
    }
  }, [state.success])

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">お問い合わせ</h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800">
        <div className="mb-8 text-sm text-gray-600 dark:text-gray-300 space-y-4">
          <p>ご要望やご意見、ご質問をお送りください。</p>
          <p>携帯キャリアのメールのアドレス( @docomo.ne.jp, @ezweb.ne.jpなど)にはこちらからの返信が届かない場合があります。</p>
          <p>PCからのメールを受信できるメールアドレスを入力してください。</p>
        </div>

        {state.success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
            {state.message}
          </div>
        )}

        {state.error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
            {state.error}
          </div>
        )}

        <form action={formAction} ref={formRef} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Eメールアドレス
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="例: user@example.com"
              className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-1">
              お問い合わせ内容(要望や質問など)
            </label>
            <textarea
              id="content"
              name="content"
              required
              rows={6}
              className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="text-center">
            <button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 text-white px-8 py-3 rounded-md font-bold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isPending ? '送信中...' : '送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
