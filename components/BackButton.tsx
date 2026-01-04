'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useLoading } from '@/context/LoadingContext'
import { useEffect, useState } from 'react'

interface BackButtonProps {
  href?: string
}

export default function BackButton({ href }: BackButtonProps) {
  const router = useRouter()
  const { startLoading } = useLoading()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    // ヒストリーが存在するか確認（現在のページ以外に履歴があるか）
    if (typeof window !== 'undefined' && window.history.length > 1) {
      setCanGoBack(true)
    }
  }, [])

  const handleClick = () => {
    if (href) {
      startLoading()
      router.push(href)
    } else if (canGoBack) {
      startLoading()
      router.back()
    }
  }

  const isDisabled = !href && !canGoBack

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`fixed top-1/2 -translate-y-1/2 left-4 z-40 p-2 rounded-lg shadow-lg text-white transition-all flex items-center justify-center 
        ${isDisabled 
          ? 'bg-gray-400 cursor-not-allowed opacity-50' 
          : 'bg-gray-600 hover:scale-105 hover:bg-gray-700 cursor-pointer'
        }`}
      aria-label={isDisabled ? "戻る（無効）" : "戻る"}
    >
      <ArrowLeft size={20} />
    </button>
  )
}
