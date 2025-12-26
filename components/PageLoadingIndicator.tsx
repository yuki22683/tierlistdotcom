'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * ページ遷移時のローディングインジケーター
 * URLが変更されたときに表示される
 */
export default function PageLoadingIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // 初回レンダリングはスキップ
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // URLが変更されたらローディング表示
    setIsLoading(true)

    // ページレンダリング完了を待つ
    // 実際のデータ取得とレンダリングに時間がかかるため、少し長めに表示
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800) // 800ms後に非表示

    return () => {
      clearTimeout(timer)
    }
  }, [pathname, searchParams])

  if (!isLoading) return null

  return (
    <>
      {/* 固定位置のローディングバー */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse">
        <div className="h-full bg-white/30 animate-[loading_1s_ease-in-out_infinite]" />
      </div>

      {/* オーバーレイ（オプション：コンテンツを少し暗くする） */}
      <div className="fixed inset-0 z-[9998] bg-black/10 backdrop-blur-[2px] flex items-center justify-center">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 flex items-center gap-3">
          {/* スピナー */}
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg font-medium">読み込み中...</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </>
  )
}
