'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getContrastColor } from '@/utils/colors'
import { Flag, Download, ArrowLeft, ArrowRight, Home } from 'lucide-react'
import { domToPng } from 'modern-screenshot'
import { format } from 'date-fns'
import { formatNumber } from '@/utils/formatNumber'
import BackButton from '@/components/BackButton'
import CommentSection from '@/components/comments/CommentSection'
import TierListReportModal from '@/components/TierListReportModal'
import RakutenLeftWidget from '@/components/RakutenLeftWidget'
import RakutenRightWidget from '@/components/RakutenRightWidget'
import RandomAffiliateLink from '@/components/RandomAffiliateLink'
import { useLoading } from '@/context/LoadingContext'

type Tier = {
  id: string
  name: string
  color: string
  order: number
}

type Item = {
  id: string
  name: string
  image_url: string
  default_tier_id: string | null
  background_color?: string
  is_text_item?: boolean
}

interface QuizHistoryItem {
  tierListId: string
  tierList: any
  tiers: Tier[]
  items: Item[]
  allVoteItems: any[]
}

type Props = {
  initialTierList: any
  tiers: Tier[]
  items: Item[]
  allVoteItems: any[]
  currentUser: any
  initialComments: any[]
  isAdmin?: boolean
  isBanned?: boolean
  tag?: string
  isAllGenres: boolean
  totalCount: number
}

export default function QuizPlayClient({
  initialTierList,
  tiers,
  items,
  allVoteItems,
  currentUser,
  initialComments,
  isAdmin = false,
  isBanned = false,
  tag,
  isAllGenres,
  totalCount
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { startLoading } = useLoading()
  const tierListRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(0)

  // Quiz state
  const [history, setHistory] = useState<QuizHistoryItem[]>([{
    tierListId: initialTierList.id,
    tierList: initialTierList,
    tiers,
    items,
    allVoteItems
  }])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [visitedIds, setVisitedIds] = useState<string[]>([initialTierList.id])

  // UI state
  const [showLabels, setShowLabels] = useState(false)
  const [evaluationMode, setEvaluationMode] = useState<'absolute' | 'relative'>('absolute')
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [isNavigatingHome, setIsNavigatingHome] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [touchedItemId, setTouchedItemId] = useState<string | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  
  // Determine if it is the last question
  // If we are at the end of history AND we have visited all available tier lists
  const isLastQuestion = (currentIndex === history.length - 1) && (visitedIds.length >= totalCount)

  // Results state
  const [voteStats, setVoteStats] = useState<Record<string, { total: number, count: number }> | null>(null)
  const [results, setResults] = useState<Record<string, Item[]> | null>(null)
  const [loadingResults, setLoadingResults] = useState(false)

  const currentItem = history[currentIndex]
  const currentTierList = currentItem.tierList
  const currentTiers = currentItem.tiers
  const currentItems = currentItem.items
  const currentVoteItems = currentItem.allVoteItems

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // SessionStorage management
  const storageKey = tag ? `quiz-visited-${tag}` : 'quiz-visited-all'

  useEffect(() => {
    // Load visited IDs from sessionStorage
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        const storedIds = data.visitedIds || []
        // Always include the initial tier list ID
        if (!storedIds.includes(initialTierList.id)) {
          setVisitedIds([...storedIds, initialTierList.id])
        } else {
          setVisitedIds(storedIds)
        }
      }
    } catch (e) {
      console.error('Failed to load quiz state from sessionStorage', e)
    }
  }, [storageKey, initialTierList.id])

  useEffect(() => {
    // Save visited IDs to sessionStorage
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ visitedIds }))
    } catch (e) {
      console.error('Failed to save quiz state to sessionStorage', e)
      // If quota exceeded, clear old quiz data
      try {
        const keys = Object.keys(sessionStorage)
        keys.filter(k => k.startsWith('quiz-visited-')).forEach(k => sessionStorage.removeItem(k))
        sessionStorage.setItem(storageKey, JSON.stringify({ visitedIds }))
      } catch {}
    }
  }, [visitedIds, storageKey])

  // Calculate vote statistics
  useEffect(() => {
    setLoadingResults(true)
    const fetchResults = async () => {
      if (!currentVoteItems || currentVoteItems.length === 0) {
        setVoteStats({})
        setLoadingResults(false)
        return
      }

      const tierScoreMap: Record<string, number> = {}
      const numTiers = currentTiers.length
      const medianIndex = (numTiers - 1) / 2
      currentTiers.forEach((t, idx) => {
        tierScoreMap[t.id] = medianIndex - idx
      })

      const itemScores: Record<string, { total: number, count: number }> = {}
      currentVoteItems.forEach((vi: any) => {
        if (!itemScores[vi.item_id]) itemScores[vi.item_id] = { total: 0, count: 0 }
        const score = tierScoreMap[vi.tier_id] || 0
        itemScores[vi.item_id].total += score
        itemScores[vi.item_id].count += 1
      })

      setVoteStats(itemScores)
      setLoadingResults(false)
    }
    fetchResults()
  }, [currentVoteItems, currentTiers])

  // Calculate results based on evaluation mode
  useEffect(() => {
    if (!voteStats) {
      setResults(null)
      return
    }

    const numTiers = currentTiers.length
    const calculatedTiers: Record<string, Item[]> = {}
    currentTiers.forEach(t => calculatedTiers[t.id] = [])

    const sortedItems = [...currentItems].sort((a, b) => {
      const scoreA = voteStats[a.id] ? voteStats[a.id].total / voteStats[a.id].count : -9999
      const scoreB = voteStats[b.id] ? voteStats[b.id].total / voteStats[b.id].count : -9999
      return scoreB - scoreA
    })

    if (evaluationMode === 'absolute') {
      const medianIndex = (numTiers - 1) / 2
      sortedItems.forEach(item => {
        const stats = voteStats[item.id]
        if (!stats) return
        const avg = stats.total / stats.count
        let tierIdx = Math.round(medianIndex - avg)
        tierIdx = Math.max(0, Math.min(numTiers - 1, tierIdx))
        const targetTier = currentTiers[tierIdx]
        calculatedTiers[targetTier.id].push(item)
      })
    } else {
      // Relative evaluation
      let maxAvg = -Infinity
      let minAvg = Infinity
      let hasVotes = false
      sortedItems.forEach(item => {
        const stats = voteStats[item.id]
        if (stats) {
          const avg = stats.total / stats.count
          maxAvg = Math.max(maxAvg, avg)
          minAvg = Math.min(minAvg, avg)
          hasVotes = true
        }
      })

      if (hasVotes && maxAvg > minAvg) {
        const range = maxAvg - minAvg
        sortedItems.forEach(item => {
          const stats = voteStats[item.id]
          if (!stats) return
          const avg = stats.total / stats.count
          const normalized = (avg - minAvg) / range
          const rawIdx = Math.floor((1 - normalized) * numTiers)
          let tierIdx = Math.min(numTiers - 1, Math.max(0, rawIdx))
          const targetTier = currentTiers[tierIdx]
          calculatedTiers[targetTier.id].push(item)
        })
      } else {
        const middleIndex = Math.floor((numTiers - 1) / 2)
        sortedItems.forEach(item => {
          calculatedTiers[currentTiers[middleIndex].id].push(item)
        })
      }
    }
    setResults(calculatedTiers)
  }, [evaluationMode, voteStats, currentItems, currentTiers])

  // Monitor container height for Rakuten widgets
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [results, isAnswerRevealed, showLabels])

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsAnswerRevealed(false) // Always reset to masked
      setEvaluationMode('absolute') // Reset evaluation mode
    }
  }

  const handleNext = async () => {
    if (currentIndex < history.length - 1) {
      // Navigate to next in history
      setCurrentIndex(currentIndex + 1)
      setIsAnswerRevealed(false)
      setEvaluationMode('absolute')
    } else {
      // Fetch new tier list
      setIsLoadingNext(true)
      try {
        let nextTierList
        if (tag) {
          const { data } = await supabase.rpc('get_random_tier_list_by_tag', {
            tag_name: tag,
            excluded_ids: visitedIds
          })
          nextTierList = data?.[0]
        } else {
          const { data } = await supabase.rpc('get_random_tier_list', {
            excluded_ids: visitedIds
          })
          nextTierList = data?.[0]
        }

        if (!nextTierList) {
          // Should not happen if isLastQuestion logic is correct, but safe guard
          setIsLoadingNext(false)
          return
        }

        // Fetch tiers, items, votes for new tier list
        const [
          { data: newTiers },
          { data: newItems },
          { data: newVoteItems },
          { data: tierListWithDetails }
        ] = await Promise.all([
          supabase.from('tiers').select('*').eq('tier_list_id', nextTierList.id).order('order', { ascending: true }),
          supabase.from('items').select('*').eq('tier_list_id', nextTierList.id),
          supabase.from('vote_items').select('*, votes!inner(tier_list_id)').eq('votes.tier_list_id', nextTierList.id),
          supabase.from('tier_lists').select('*, users(full_name, avatar_url), tier_list_tags(tags(name))').eq('id', nextTierList.id).single()
        ])

        const newHistoryItem: QuizHistoryItem = {
          tierListId: nextTierList.id,
          tierList: tierListWithDetails || nextTierList,
          tiers: newTiers || [],
          items: newItems || [],
          allVoteItems: newVoteItems || []
        }

        setHistory([...history, newHistoryItem])
        setCurrentIndex(history.length)
        setVisitedIds([...visitedIds, nextTierList.id])
        setIsAnswerRevealed(false)
        setEvaluationMode('absolute')
      } catch (error) {
        console.error('Failed to fetch next tier list', error)
        alert('次の問題の取得に失敗しました')
      } finally {
        setIsLoadingNext(false)
      }
    }
  }

  const handleHomeClick = () => {
    setIsNavigatingHome(true)
    startLoading()
    router.push('/')
  }

  const handleSaveAsImage = async () => {
    const element = document.getElementById('tier-list-content')
    if (!element) return

    setIsScreenshotLoading(true)
    try {
      const dataUrl = await domToPng(element, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: 2
      })
      const link = document.createElement('a')
      link.download = `${currentTierList.title}_tierlist.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error(err)
      alert("画像の保存に失敗しました")
    } finally {
      setIsScreenshotLoading(false)
    }
  }

  const handleItemDoubleClick = (item: Item) => {
    if (!item.name || item.name === '名無し') return
    router.push(`/items/${encodeURIComponent(item.name)}`)
  }

  return (
    <div ref={containerRef} className="container mx-auto py-4 px-4 max-w-5xl relative">
      <RakutenLeftWidget containerHeight={containerHeight} uniqueKey={currentTierList.id} />
      <RakutenRightWidget containerHeight={containerHeight} uniqueKey={currentTierList.id} />
      <main className="pb-10 pt-2">
      <BackButton href="/quiz/select-genre" />
      <h1 className="text-3xl font-bold mb-2 text-center">
        {isAnswerRevealed ? currentTierList.title : '？？？？'}
      </h1>

      {/* Question Counter */}
      <div className="text-center mb-4 text-lg font-semibold text-muted-foreground">
        問題 {currentIndex + 1} / {totalCount}
      </div>

      {/* Evaluation Mode Toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setEvaluationMode('absolute')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${
              evaluationMode === 'absolute'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600'
            }`}
          >
            絶対評価
          </button>
          <button
            type="button"
            onClick={() => setEvaluationMode('relative')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors ${
              evaluationMode === 'relative'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600'
            }`}
          >
            相対評価
          </button>
        </div>
      </div>

      {/* Tier List Results Display */}
      <div ref={tierListRef}>
        {loadingResults ? (
          <div className="text-center py-20 text-muted-foreground">集計中...</div>
        ) : (
          <div id="tier-list-content" className="p-2 mb-6">
            <div className="flex flex-col">
              {currentTiers.map((tier) => (
                <div key={tier.id} className="flex min-h-[68px] sm:min-h-[102px] border-b border-x first:border-t overflow-hidden bg-white dark:bg-zinc-900">
                  <div
                    className="w-16 sm:w-32 flex flex-col justify-center items-center p-2 text-center font-bold text-sm sm:text-xl break-words line-clamp-3"
                    style={{ backgroundColor: tier.color, color: getContrastColor(tier.color) }}
                  >
                    {tier.name}
                  </div>
                  <div className="flex-1 flex flex-wrap gap-0 p-0 bg-[#1a1a1a]">
                    {results?.[tier.id]?.map((item) => (
                      <div
                        key={item.id}
                        className="relative w-[68px] h-[68px] sm:w-[102px] sm:h-[102px] group cursor-pointer"
                        onMouseEnter={!isTouchDevice ? () => setSelectedItemId(item.id) : undefined}
                        onMouseLeave={!isTouchDevice ? () => setSelectedItemId(null) : undefined}
                        onClick={() => {
                          setSelectedItemId(selectedItemId === item.id ? null : item.id)
                          if (isTouchDevice && !showLabels) {
                            setTouchedItemId(touchedItemId === item.id ? null : item.id)
                          }
                        }}
                      >
                        {item.is_text_item ? (
                          <div
                            className="w-full h-full rounded shadow-sm flex items-center justify-center p-2 text-xs text-center"
                            style={{
                              backgroundColor: item.background_color || '#3b82f6',
                              color: getContrastColor(item.background_color || '#3b82f6')
                            }}
                          >
                            {item.name}
                          </div>
                        ) : (
                          <>
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded shadow-sm"/>
                            <div className={`absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-0.5 px-1 break-words line-clamp-3 ${
                              showLabels
                                ? ''
                                : isTouchDevice
                                  ? (touchedItemId === item.id ? '' : 'opacity-0')
                                  : 'opacity-0 group-hover:opacity-100 transition-opacity'
                            }`}>{item.name}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {(!results || Object.values(results ?? {}).flat().length === 0) && (
                <div className="text-center py-20 text-muted-foreground">
                  まだ投票がありません
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="flex justify-center gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-6 py-3 rounded-lg font-bold bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>
              <span className="hidden sm:inline">前の問題</span>
              <span className="sm:hidden">前へ</span>
            </span>
          </button>
          <button
            onClick={() => setIsAnswerRevealed(!isAnswerRevealed)}
            className="px-6 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
          >
            {isAnswerRevealed ? (
              <span>
                <span className="hidden sm:inline">答えを隠す</span>
                <span className="sm:hidden">隠す</span>
              </span>
            ) : (
              <span>
                <span className="hidden sm:inline">答えを見る</span>
                <span className="sm:hidden">答え</span>
              </span>
            )}
          </button>
          {isLastQuestion ? (
            <button
              onClick={handleHomeClick}
              disabled={isNavigatingHome}
              className="px-6 py-3 rounded-lg font-bold bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Home size={20} />
              <span>
                <span className="hidden sm:inline">ホームに戻る</span>
                <span className="sm:hidden">終了</span>
              </span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={isLoadingNext}
              className="px-6 py-3 rounded-lg font-bold bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <span>
                <span className="hidden sm:inline">次の問題</span>
                <span className="sm:hidden">次へ</span>
              </span>
              <ArrowRight size={20} />
            </button>
          )}
        </div>
        
        {/* Description Display */}
        {isAnswerRevealed && currentTierList.description && (
          <div className="w-full max-w-3xl text-left mt-4 mb-2">
            <p className="text-foreground whitespace-pre-wrap">{currentTierList.description}</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-col items-start gap-2 mt-6 mb-4 text-sm text-gray-500">
        <div className="flex flex-wrap items-center justify-start gap-4">
          <Link
            href={`/users/${currentTierList.user_id}/tier-lists`}
            className="flex items-center gap-2 hover:underline hover:text-indigo-600 transition-colors"
          >
            <img
              src={currentTierList.users?.avatar_url || '/placeholder-avatar.png'}
              className="w-5 h-5 rounded-full"
              alt="creator"
            />
            <span>作成者: {currentTierList.users?.full_name || '不明'}</span>
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-4">
          <span>{format(new Date(currentTierList.created_at), 'yyyy/MM/dd')}</span>
          <span>{formatNumber(currentTierList.vote_count)} 票</span>
          <span>{formatNumber(currentTierList.view_count ?? 0)} 閲覧</span>
        </div>
        {isAnswerRevealed && currentTierList.tier_list_tags && currentTierList.tier_list_tags.length > 0 && (
          <div className="flex flex-wrap justify-start gap-2 mt-3">
            {currentTierList.tier_list_tags.map((t: any) => (
              t.tags && (
                <Link
                  key={t.tags.name}
                  href={`/search?tag=${encodeURIComponent(t.tags.name)}`}
                  className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full hover:bg-indigo-200 transition-colors dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
                >
                  {t.tags.name}
                </Link>
              )
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button
          onClick={() => !currentUser ? undefined : setIsReportModalOpen(true)}
          disabled={!currentUser || isBanned}
          className="flex items-center justify-center px-3 py-2 border rounded-md hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={(!currentUser && !isBanned) ? "ログインが必要です" : isBanned ? "投稿禁止" : "通報"}
        >
          <Flag size={20} />
          {!currentUser && !isBanned && <span className="ml-2 text-xs">ログインが必要です</span>}
        </button>

        <button
          onClick={handleSaveAsImage}
          disabled={isScreenshotLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border rounded-md hover:bg-accent transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <Download size={16} />
          <span>画像として保存</span>
        </button>

        <button
          onClick={() => setShowLabels(!showLabels)}
          className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border rounded-md hover:bg-accent transition-colors whitespace-nowrap"
        >
          {showLabels ? '名前を非表示' : '名前を表示'}
        </button>
      </div>

      {/* Comments Section */}
      <div className="mt-8">
        <div className="flex justify-center mb-6">
          <RandomAffiliateLink index={300} />
        </div>
        <CommentSection
          tierListId={currentTierList.id}
          currentUserId={currentUser?.id}
          initialComments={initialComments}
          tierListOwnerId={currentTierList.user_id}
          isAdmin={isAdmin}
        />
      </div>

        {/* Report Modal */}
        {isReportModalOpen && currentUser && (
          <TierListReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            tierListId={currentTierList.id}
          />
        )}
      </main>
    </div>
  )
}
