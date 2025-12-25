'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useTierListStore } from '@/store/tierListStore'

export default function TagInput() {
  const { tags, addTag, removeTag } = useTierListStore()
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<{id: string, name: string}[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const supabase = createClient()
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Validation Regex: Alphanumeric, Underscore, Hyphen, Hiragana, Katakana, Kanji
  const validRegex = /^[\w\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/

  // Helper for Japanese fuzzy matching (Hiragana <-> Katakana)
  const toFuzzyRegex = (str: string) => {
    return str.split('').map(char => {
        if (char >= '\u3041' && char <= '\u3096') { // Hiragana
            const kata = String.fromCharCode(char.charCodeAt(0) + 0x60)
            return `[${char}${kata}]`
        }
        if (char >= '\u30A1' && char <= '\u30F6') { // Katakana
            const hira = String.fromCharCode(char.charCodeAt(0) - 0x60)
            return `[${hira}${char}]`
        }
        // Escape special regex characters
        return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }).join('')
  }

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!input || input.length < 1) {
        setSuggestions([])
        return
      }

      const fuzzySearch = toFuzzyRegex(input)
      const { data } = await supabase.rpc('get_tags_suggestions', { search_term: fuzzySearch })
      if (data) {
        // Filter out tags already added
        setSuggestions(data.filter((s: any) => !tags.includes(s.name)))
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 300) // Debounce
    return () => clearTimeout(timeoutId)
  }, [input, supabase, tags])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ignore IME composition
    if ((e.nativeEvent as any).isComposing || e.key === 'Process' || e.keyCode === 229) {
        return;
    }

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(input)
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const handleAddTag = (tagToAdd: string) => {
    const normalized = tagToAdd.trim()
    if (!normalized) return

    if (tags.length >= 5) {
      alert('タグは最大5個までです')
      return
    }

    if (normalized.length > 20) {
      alert('タグは20文字以内で入力してください')
      return
    }

    if (!validRegex.test(normalized)) {
      alert('使用できない文字が含まれています（許可：英数字、ひらがな、カタカナ、漢字、_、-）')
      return
    }
    
    // Case insensitive check is handled by store logic? Store handles exact match.
    // Requirement: "Case insensitive". Let's check against existing tags.
    const exists = tags.some(t => t.toLowerCase() === normalized.toLowerCase())
    if (exists) {
        setInput('')
        return 
    }

    addTag(normalized)
    setInput('')
    setShowSuggestions(false)
  }

  const handleSelectSuggestion = (tag: string) => {
      handleAddTag(tag)
  }

  return (
    <div className="w-full" ref={wrapperRef}>
      <label className="block text-sm font-medium mb-1">タグ (最大5個)</label>
      <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-background focus-within:ring-1 focus-within:ring-indigo-500 min-h-[42px]">
        {tags.map(tag => (
          <div key={tag} className="flex items-center gap-1 px-2 py-1 text-sm bg-indigo-100 text-indigo-800 rounded-full dark:bg-indigo-900 dark:text-indigo-200">
            <span>{tag}</span>
            <button onClick={() => removeTag(tag)} className="hover:text-indigo-600 dark:hover:text-indigo-400">
              <X size={14} />
            </button>
          </div>
        ))}
        
        <div className="relative flex-1 min-w-[120px]">
            <input
            type="text"
            value={input}
            onChange={e => {
                const val = e.target.value
                // Prevent spaces
                if (val.includes(' ') || val.includes('　')) return
                setInput(val)
                setShowSuggestions(true)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={tags.length < 5 ? "タグを入力..." : ""}
            disabled={tags.length >= 5}
            className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-zinc-800 border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                    {suggestions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => handleSelectSuggestion(s.name)}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        英数字、ひらがな、カタカナ、漢字、アンダーバー(_)、ハイフン(-)が使用可能です。スペースは使用できません。
      </p>
    </div>
  )
}
