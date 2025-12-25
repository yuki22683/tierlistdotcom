'use client'

import { useAffiliateLinks } from '@/context/AffiliateLinkContext'
import { useEffect, useState } from 'react'

interface Props {
    className?: string
    index?: number
}

export default function RandomAffiliateLink({ className = "", index = 0 }: Props) {
  const { getLink } = useAffiliateLinks()
  const [link, setLink] = useState<any>(null)

  useEffect(() => {
    // Small timeout to ensure context is ready or just strict mode double invocation handling
    const l = getLink(index)
    setLink(l)
  }, [getLink, index])

  if (!link) return null

  return (
    <div className={`hidden sm:flex items-center ${className}`}>
      <a href={link.href} target="_blank" rel="nofollow sponsored noopener" style={{ wordWrap: 'break-word' }}>
        <img src={link.img} style={{ border: 0 }} alt="" title="" />
      </a>
    </div>
  )
}
