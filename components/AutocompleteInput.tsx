'use client'

import React, { useState, useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/utils/supabase/client'

interface Suggestion {
  name: string
  total_votes: number
}

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
  onValueChange: (val: string) => void
  textColor?: string
}

export default function AutocompleteInput({ 
  value, 
  onValueChange, 
  textColor,
  className,
  onFocus,
  onBlur,
  ...props 
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Debounce search logic
  // Implementing simplified debounce locally to avoid extra file creation if possible, 
  // but a hook is cleaner. I'll use a local timer.
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, 300)
    return () => clearTimeout(handler)
  }, [value])

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedValue || debouncedValue.length < 1) {
        setSuggestions([])
        return
      }

      const { data, error } = await supabase
        .rpc('search_popular_items', { search_query: debouncedValue, limit_count: 3 })
      
      if (!error && data) {
        setSuggestions(data)
      } else {
        setSuggestions([])
      }
    }

    if (showSuggestions) {
        fetchSuggestions()
    }
  }, [debouncedValue, showSuggestions, supabase])

  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setShowSuggestions(true)
    updatePosition()
    if (onFocus) onFocus(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay hiding to allow click on suggestion
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
    if (onBlur) onBlur(e)
  }

  const handleSelect = (name: string) => {
    onValueChange(name)
    setShowSuggestions(false)
  }

  // Update position on scroll/resize
  useEffect(() => {
    if (showSuggestions) {
        window.addEventListener('scroll', updatePosition, true)
        window.addEventListener('resize', updatePosition)
        return () => {
            window.removeEventListener('scroll', updatePosition, true)
            window.removeEventListener('resize', updatePosition)
        }
    }
  }, [showSuggestions])

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
        autoComplete="off" // Disable browser default autocomplete
        {...props}
      />
      {showSuggestions && suggestions.length > 0 && createPortal(
        <ul 
            className="absolute z-[9999] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg overflow-hidden"
            style={{ 
                top: position.top + 4, 
                left: position.left,
                minWidth: '150px', // Ensure it's not too thin for small inputs
                maxWidth: '300px'
            }}
        >
          {suggestions.map((s) => (
            <li 
                key={s.name}
                onMouseDown={(e) => {
                    e.preventDefault() // Prevent blur before click
                    handleSelect(s.name)
                }}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-900 dark:text-gray-100 flex justify-between gap-2"
            >
                <span className="truncate">{s.name}</span>
                {/* Optional: Show votes or popularity indicator if needed, 
                    but user just asked for order. 
                    Maybe a small fire icon or star? Let's keep it simple text for now.
                */}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  )
}
