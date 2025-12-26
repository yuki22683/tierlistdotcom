'use client'

import { useEffect } from 'react'

export default function QuizSessionCleaner() {
  useEffect(() => {
    try {
      // Clear all quiz visited history when visiting the genre selection page
      // This ensures a fresh start for any genre selected
      const keys = Object.keys(sessionStorage)
      keys.forEach(key => {
        if (key.startsWith('quiz-visited-')) {
          sessionStorage.removeItem(key)
        }
      })
    } catch (e) {
      console.error('Failed to clear quiz session', e)
    }
  }, [])

  return null
}
