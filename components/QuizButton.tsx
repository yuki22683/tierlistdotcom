'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function QuizButton() {
  const router = useRouter()
  const [bottomOffset, setBottomOffset] = useState(8)

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
        // Base offset (8px) + overlap
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

  const handleClick = () => {
    router.push('/quiz/select-genre')
  }

  return (
    <button
      onClick={handleClick}
      className="px-6 sm:px-10 py-4 rounded-lg font-bold text-lg text-white transition-all shadow-lg bg-green-600 hover:scale-105 hover:bg-green-700 whitespace-nowrap"
    >
      タイトル当てクイズ
    </button>
  )
}
