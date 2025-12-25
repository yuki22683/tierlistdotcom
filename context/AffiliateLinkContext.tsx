'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { affiliateLinks } from '@/utils/affiliateLinks'

type AffiliateLink = typeof affiliateLinks[0]

interface AffiliateLinkContextType {
  getLink: (index: number) => AffiliateLink | null
}

const AffiliateLinkContext = createContext<AffiliateLinkContextType>({
  getLink: () => null,
})

export const useAffiliateLinks = () => useContext(AffiliateLinkContext)

export function AffiliateLinkProvider({ children }: { children: React.ReactNode }) {
  const [shuffledLinks, setShuffledLinks] = useState<AffiliateLink[]>([])

  useEffect(() => {
    const shuffled = [...affiliateLinks].sort(() => Math.random() - 0.5)
    setShuffledLinks(shuffled)
  }, [])

  const getLink = (index: number) => {
    if (shuffledLinks.length === 0) return null
    return shuffledLinks[index % shuffledLinks.length]
  }

  return (
    <AffiliateLinkContext.Provider value={{ getLink }}>
      {children}
    </AffiliateLinkContext.Provider>
  )
}
