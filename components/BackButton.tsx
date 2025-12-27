'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  href?: string
}

export default function BackButton({ href }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <button
      onClick={handleClick}
      className="fixed top-20 left-4 z-40 p-2 rounded-lg shadow-lg text-white transition-all bg-gray-600 hover:scale-105 hover:bg-gray-700 flex items-center justify-center"
      aria-label="戻る"
    >
      <ArrowLeft size={20} />
    </button>
  )
}
