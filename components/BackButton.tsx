'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
    >
      <ArrowLeft size={16} className="mr-1" />
      戻る
    </button>
  )
}
