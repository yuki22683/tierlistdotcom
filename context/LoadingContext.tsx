'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface LoadingContextType {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)

  const startLoading = () => {
    console.log('[LoadingContext] Starting loading')
    // 即座にUIをブロック（React状態更新を待たない）
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'none'
      document.body.style.cursor = 'wait'
    }
    setIsLoading(true)
  }

  const stopLoading = () => {
    console.log('[LoadingContext] Stopping loading')
    // UIブロックを解除
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = ''
      document.body.style.cursor = ''
    }
    setIsLoading(false)
  }

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}
