'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useLoading } from '@/context/LoadingContext'

/**
 * ページ遷移時のローディングインジケーター
 * URLが変更されたときに表示される
 */
function PageLoadingIndicatorInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)
  const { isLoading, startLoading, stopLoading } = useLoading()

  // クライアントサイドでのみ動作させる（ハイドレーションエラー回避）
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // URL変更時のローディング表示
  useEffect(() => {
    if (!isMounted) return

    const searchParamsString = searchParams?.toString() || ''
    console.log('[PageLoadingIndicator] URL changed:', pathname, searchParamsString)

    // URLが変更されたらローディング表示
    startLoading()

    // ページレンダリング完了を待つ
    // 実際のデータ取得とレンダリングに時間がかかるため、少し長めに表示
    const timer = setTimeout(() => {
      console.log('[PageLoadingIndicator] Hiding loading indicator')
      // UIブロックを解除
      if (typeof document !== 'undefined') {
        document.body.classList.remove('page-loading')
      }
      stopLoading()
    }, 1000) // 1秒後に非表示

    return () => {
      clearTimeout(timer)
      // クリーンアップ時もUIブロックを解除
      if (typeof document !== 'undefined') {
        document.body.classList.remove('page-loading')
      }
    }
  }, [pathname, searchParams, isMounted, startLoading, stopLoading])

  // リンククリック時にローディングを開始
  useEffect(() => {
    if (!isMounted) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // data-no-loading属性を持つ要素またはその子孫のクリックは無視
      if (target.closest('[data-no-loading]')) {
        console.log('[PageLoadingIndicator] Click on no-loading element, skipping')
        return
      }

      const link = target.closest('a')

      if (link && link.href && !link.href.startsWith('javascript:') && !link.target) {
        const url = new URL(link.href)
        const currentUrl = new URL(window.location.href)

        // 別ページへの遷移の場合のみローディングを表示
        if (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search) {
          console.log('[PageLoadingIndicator] Link clicked, showing loading')
          // 即座にUIをブロック（React状態更新を待たない）
          document.body.classList.add('page-loading')
          startLoading()
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [isMounted, startLoading])

  // クライアントサイドでマウントされるまで何も表示しない
  if (!isMounted) return null

  if (!isLoading) return null

  return (
    <>
      {/* 固定位置のローディングバー */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse pointer-events-auto">
        <div className="h-full bg-white/30 animate-[loading_1s_ease-in-out_infinite]" />
      </div>

      {/* オーバーレイ（操作をブロック） */}
      <div className="fixed inset-0 z-[9998] bg-black/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-auto">
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

export default function PageLoadingIndicator() {
  return (
    <Suspense fallback={null}>
      <PageLoadingIndicatorInner />
    </Suspense>
  )
}
