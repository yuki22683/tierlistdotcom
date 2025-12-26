'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RandomAffiliateLink from './RandomAffiliateLink'
import { createClient } from '@/utils/supabase/client'

interface CreateTierListButtonProps {
  isBanned: boolean
  dailyLimitReached: boolean
  isLoggedIn: boolean
  categoryId?: string
  affiliateIndex?: number
}

export default function CreateTierListButton({ isBanned, dailyLimitReached, isLoggedIn, categoryId, affiliateIndex = 0 }: CreateTierListButtonProps) {
  const router = useRouter()
  const [bottomOffset, setBottomOffset] = useState(8) // Reduced further to 8
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(isLoggedIn)

  useEffect(() => {
    const handleScroll = () => {
      const footer = document.getElementById('global-footer')
      if (!footer) return

      const footerRect = footer.getBoundingClientRect()
      const windowHeight = window.innerHeight

      // If footer is visible
      if (footerRect.top < windowHeight) {
        // Calculate overlap
        const overlap = windowHeight - footerRect.top
        // Base offset (8px) + overlap (no extra padding)
        setBottomOffset(8 + overlap)
      } else {
        setBottomOffset(8)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    // Initial check
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  // Monitor auth state changes
  useEffect(() => {
    const supabase = createClient()

    // Check initial auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsUserLoggedIn(!!user)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsUserLoggedIn(!!session?.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleClick = (e: React.MouseEvent) => {
      if (dailyLimitReached) {
          e.preventDefault()
          alert("1日の作成上限は20件です。")
      } else {
          const url = categoryId ? `/tier-lists/new?categoryId=${categoryId}` : '/tier-lists/new'
          router.push(url)
      }
  }

  const renderButton = () => {
    if (!isUserLoggedIn) {
      return (
          <div className="group relative">
              <button
                  disabled
                  className="px-3 sm:px-10 py-3 rounded-lg font-bold text-white cursor-not-allowed shadow-lg opacity-50 transition-all bg-indigo-600 flex flex-col items-center leading-tight whitespace-nowrap"
              >
                  <span className="text-sm sm:text-lg">+ ティアリストを作成</span>
                  <span className="text-[10px] sm:text-xs mt-1">ログインが必要です</span>
              </button>
          </div>
      )
    }

    if (isBanned) {
      return (
          <div className="group relative">
              <button 
                  disabled 
                  className="px-3 sm:px-10 py-4 rounded-lg font-bold text-sm sm:text-lg bg-red-100 text-red-800 cursor-not-allowed shadow-lg border border-red-200 whitespace-nowrap"
              >
                  🚫 投稿禁止
              </button>
              <span className="absolute bottom-full left-0 mb-2 w-max px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  アカウントが制限されています
              </span>
          </div>
      )
    }

    return (
        <button 
            onClick={handleClick}
            disabled={dailyLimitReached}
            className={`px-3 sm:px-10 py-4 rounded-lg font-bold text-sm sm:text-lg text-white transition-all shadow-lg bg-indigo-600 hover:scale-105 hover:bg-indigo-700 whitespace-nowrap ${dailyLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            + ティアリストを作成
        </button>
      )
  }

  return (
    <div
        className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-4 group/container transition-all duration-100 ease-out"
        style={{ bottom: `${bottomOffset}px` }}
    >
      {renderButton()}
      <button
        onClick={() => router.push('/quiz/select-genre')}
        className="px-3 sm:px-10 py-4 rounded-lg font-bold text-sm sm:text-lg text-white transition-all shadow-lg bg-gray-600 hover:scale-105 hover:bg-gray-700 whitespace-nowrap"
      >
        タイトル当てクイズ
      </button>
      <div className="[@media(max-width:768px)_and_(orientation:portrait)]:hidden transition-all duration-300 transform translate-x-0 group-hover/container:translate-x-1">
        <RandomAffiliateLink index={affiliateIndex} />
      </div>
    </div>
  )
}