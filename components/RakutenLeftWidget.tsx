'use client'

import { useEffect, useState } from 'react'
import RakutenWidgetList from './RakutenWidgetList'

interface Props {
  containerHeight?: number
  uniqueKey?: string
}

export default function RakutenLeftWidget({ containerHeight, uniqueKey }: Props) {
  const [extraCols, setExtraCols] = useState(0)
  const [showStandard, setShowStandard] = useState(false)

  useEffect(() => {
    const calculateCols = () => {
      const containerWidth = 1024 // max-w-5xl
      const windowWidth = window.innerWidth
      const spacePerSide = (windowWidth - containerWidth) / 2
      
      // Check if there is enough space for the standard column (needs ~220px)
      setShowStandard(spacePerSide >= 220)

      // Calculate extra columns
      // First column needs 220px. Each additional column needs another 220px.
      const totalCols = Math.floor(spacePerSide / 220)
      setExtraCols(Math.max(0, totalCols - 1))
    }

    calculateCols()
    window.addEventListener('resize', calculateCols)
    return () => window.removeEventListener('resize', calculateCols)
  }, [])

  return (
    <>
      {/* Standard Column */}
      {showStandard && (
        <div className="hidden lg:block absolute top-0 left-[-220px] z-10 w-[200px]">
          <RakutenWidgetList containerHeight={containerHeight} uniqueKey={uniqueKey} />
        </div>
      )}

      {/* Extra Columns */}
      {Array.from({ length: extraCols }).map((_, i) => (
        <div 
            key={`left-extra-${i}`}
            className="hidden lg:block absolute top-0 z-10 w-[200px]"
            style={{ left: `${-220 * (i + 2)}px` }}
        >
          <RakutenWidgetList containerHeight={containerHeight} uniqueKey={`${uniqueKey}-left-${i}`} />
        </div>
      ))}
    </>
  )
}