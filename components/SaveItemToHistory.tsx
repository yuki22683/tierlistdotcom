'use client'

import { useEffect } from 'react'

export default function SaveItemToHistory({
  itemName,
  imageUrl
}: {
  itemName: string
  imageUrl: string | null
}) {
  useEffect(() => {
    const saveToHistory = () => {
      try {
        const historyKey = 'viewedItems'
        const maxHistory = 10
        const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')

        // Remove current item if exists (to move it to top)
        const newHistory = currentHistory.filter((item: any) => item.name !== itemName)

        // Add to front
        newHistory.unshift({
          name: itemName,
          image_url: imageUrl
        })

        // Limit size
        if (newHistory.length > maxHistory) {
          newHistory.pop()
        }

        localStorage.setItem(historyKey, JSON.stringify(newHistory))
      } catch (e) {
        console.error('Failed to save item history', e)
      }
    }
    saveToHistory()
  }, [itemName, imageUrl])

  return null
}
