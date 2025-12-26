'use client'

import Navbar from '@/components/Navbar'
import { usePathname } from 'next/navigation'

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPlayPage = pathname?.startsWith('/quiz/play')

  return (
    <>
      <Navbar disableLogout={isPlayPage} />
      {children}
    </>
  )
}
