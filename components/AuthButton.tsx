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
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isTierListScreen = pathname?.startsWith('/tier-lists/')
  const isLogoutDisabled = disableLogout || isTierListScreen

  // 初回マウント時にセッションを取得
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    initAuth()
  }, [supabase])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthButton] Auth state changed:', event)

      // ネイティブアプリでのSIGNED_INイベントは無視（ページリロードが発生するため）
      if (isNativeApp() && event === 'SIGNED_IN') {
        console.log('[AuthButton] Ignoring SIGNED_IN event in native app (page will reload)')
        return
      }

      // 認証状態の変更を反映
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogin = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
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
      // OAuth処理が開始されたらローディングは継続（ページ遷移するまで）
    } catch (error) {
      console.error('[AuthButton] Login error:', error)
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    if (isLogoutDisabled || isLoading) return

    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      // onAuthStateChangeで自動的にローディングが解除される
    } catch (error) {
      console.error('[AuthButton] Logout error:', error)
      setIsLoading(false)
    }
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
            disabled={isLogoutDisabled || isLoading}
            className={`p-2 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                isLogoutDisabled || isLoading
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-rose-600 text-white hover:bg-rose-700'
            }`}
            title={isLogoutDisabled ? "この画面ではログアウトできません" : isLoading ? "処理中..." : "ログアウト"}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">処理中...</span>
              </>
            ) : (
              <>
                <LogOut size={20} className="sm:hidden" />
                <span className="hidden sm:inline">ログアウト</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`p-2 sm:px-4 sm:py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
            isLoading
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          title={isLoading ? "処理中..." : "Googleでログイン"}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">処理中...</span>
            </>
          ) : (
            <>
              <LogIn size={20} className="sm:hidden" />
              <span className="hidden sm:inline">Googleでログイン</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
