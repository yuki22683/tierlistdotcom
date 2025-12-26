'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { User as UserIcon, LogIn, LogOut } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { isNativeApp } from '@/utils/platform'

interface AuthButtonProps {
  disableLogout?: boolean
}

export default function AuthButton({ disableLogout = false }: AuthButtonProps) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isTierListScreen = pathname?.startsWith('/tier-lists/')
  const isLogoutDisabled = disableLogout || isTierListScreen

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogin = async () => {
    // 現在のパスとクエリパラメータを保持
    const currentPath = window.location.pathname + window.location.search
    const encodedPath = encodeURIComponent(currentPath)

    // ネイティブアプリの場合はDeep Linkを使用
    const redirectTo = isNativeApp()
      ? `com.tierlist.app://auth/callback?next=${encodedPath}`
      : `${window.location.origin}/auth/callback?next=${encodedPath}`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })
  }

  const handleLogout = async () => {
    if (isLogoutDisabled) return
    await supabase.auth.signOut()
  }

  return (
    <div>
      {user ? (
        <div className="flex items-center gap-2 sm:gap-4">
          {user.user_metadata?.avatar_url ? (
             <img 
               src={user.user_metadata.avatar_url} 
               alt="User Avatar" 
               className="w-8 h-8 rounded-full border border-gray-200"
             />
          ) : (
             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <UserIcon size={20} className="text-gray-500" />
             </div>
          )}
          <button
            onClick={handleLogout}
            disabled={isLogoutDisabled}
            className={`p-2 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center ${
                isLogoutDisabled
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-rose-600 text-white hover:bg-rose-700'
            }`}
            title={isLogoutDisabled ? "この画面ではログアウトできません" : "ログアウト"}
          >
            <LogOut size={20} className="sm:hidden" />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="p-2 sm:px-4 sm:py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
          title="Googleでログイン"
        >
          <LogIn size={20} className="sm:hidden" />
          <span className="hidden sm:inline">Googleでログイン</span>
        </button>
      )}
    </div>
  )
}
