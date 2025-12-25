'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { AlertOctagon } from 'lucide-react'

export default function GlobalBanGuard() {
  const [isBanned, setIsBanned] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkBanStatus()
    
    // Subscribe to realtime changes on user profile
    // This allows immediate lockout if banned while online
    const channel = supabase
      .channel('ban-check')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users' 
      }, (payload) => {
          if (payload.new.id) {
             // We need to check if this update is for the CURRENT user
             supabase.auth.getUser().then(({ data: { user } }) => {
                 if (user && user.id === payload.new.id) {
                     setIsBanned(payload.new.is_banned)
                 }
             })
          }
      })
      .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
  }, [pathname])

  const checkBanStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', user.id)
      .single()

    if (data?.is_banned) {
      setIsBanned(true)
    }
  }

  if (!isBanned) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl max-w-md w-full p-6 text-center border-2 border-red-500">
        <div className="flex justify-center mb-4">
          <AlertOctagon size={48} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">アカウント利用制限</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          このアカウントは過去に不適切な投稿があったため、投稿を禁止されています。
          <br/>
          <span className="text-xs text-gray-500 mt-2 block">閲覧のみ可能です。</span>
        </p>
        <button 
          onClick={() => setIsBanned(false)} // Just closes the dialog temporarily? Or redirects?
          // If we want strict lockout, maybe we shouldn't allow closing it easily, 
          // or we just allow closing so they can VIEW, but buttons are disabled globally.
          // The request said "Dialog should appear... and buttons disabled".
          // So let's allow them to close the dialog to browse read-only.
          className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md font-bold hover:bg-gray-300 transition"
        >
          閉じる (閲覧のみ)
        </button>
      </div>
    </div>
  )
}
