'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AllGenresButton() {
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
    router.push('/quiz/play?all=true')
  }

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-100 ease-out"
      style={{ bottom: `${bottomOffset}px` }}
    >
      <button
        onClick={handleClick}
        className="px-6 sm:px-10 py-4 rounded-lg font-bold text-lg text-white transition-all shadow-lg bg-indigo-600 hover:scale-105 hover:bg-indigo-700 whitespace-nowrap"
      >
        全てのジャンルから出題
      </button>
    </div>
  )
}
