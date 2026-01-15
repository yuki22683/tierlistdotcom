'use client'

import { createClient } from '@/utils/supabase/client'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getContrastColor } from '@/utils/colors'
import { Plus, Trash2, GripVertical, X, Image, Type, Pipette, Flag, Download, Circle, Repeat2, Share2 } from 'lucide-react'
import { useTierListStore, TierItem, Tier as StoreTier } from '@/store/tierListStore'
import { shareContent } from '@/utils/share'
import { isNativeApp } from '@/utils/platform'
import { domToPng } from 'modern-screenshot'
import { format } from 'date-fns'
import { formatNumber } from '@/utils/formatNumber'
import { useLoading } from '@/context/LoadingContext'

import BackButton from '@/components/BackButton'
import CommentSection from '@/components/comments/CommentSection'
import TierListReportModal from '@/components/TierListReportModal'
import TagInput from '@/components/TagInput'
import AutocompleteInput from '@/components/AutocompleteInput'
import TierListCard from '@/components/TierListCard'
import RakutenLeftWidget from '@/components/RakutenLeftWidget'
import RakutenRightWidget from '@/components/RakutenRightWidget'
import RandomAffiliateLink from '@/components/RandomAffiliateLink'
import ImageCropper from '@/components/ImageCropper'
import { deleteImageIfUnused } from '@/utils/imageCleanup'
import { submitVote } from '@/app/actions/vote'

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

type Props = {
  tierList: any
  tiers: Tier[]
  items: Item[]
  userVote: any
  userVoteItems: any
  allVoteItems: any[]
  currentUser: any
  initialComments: any[]
  isAdmin?: boolean
  isBanned?: boolean
  relatedTierLists?: any[]
  relatedItems?: any[]
  userVotedTierListIds?: string[]
}

// --- Custom Scrollbar Component for Page Scroll ---
function PageScrollbar() {
  const [isMounted, setIsMounted] = useState(false)
  const [scrollbarHeight, setScrollbarHeight] = useState(0)
  const [scrollbarTop, setScrollbarTop] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ y: 0, scrollTop: 0 })

  // クライアントサイドでのみマウント
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const updateScrollbar = useCallback(() => {
    if (typeof window === 'undefined') return

    const navbarHeight = 56 // h-14 = 56px
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = window.innerHeight
    const availableHeight = clientHeight - navbarHeight

    // スクロールが必要かチェック
    if (scrollHeight <= clientHeight) {
      setIsVisible(false)
      return
    }

    setIsVisible(true)

    // スクロールバーの高さを計算（ページの高さに対する可視領域の割合）
    const thumbHeight = Math.max((clientHeight / scrollHeight) * availableHeight, 40)
    setScrollbarHeight(thumbHeight)

    // スクロールバーの位置を計算
    const maxScroll = scrollHeight - clientHeight
    const scrollPercentage = scrollTop / maxScroll
    const maxThumbTop = availableHeight - thumbHeight
    setScrollbarTop(scrollPercentage * maxThumbTop)
  }, [])

  useEffect(() => {
    updateScrollbar()
    window.addEventListener('scroll', updateScrollbar)
    window.addEventListener('resize', updateScrollbar)

    return () => {
      window.removeEventListener('scroll', updateScrollbar)
      window.removeEventListener('resize', updateScrollbar)
    }
  }, [updateScrollbar])

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // ドラッグ開始時の位置とスクロール位置を記録
    dragStartRef.current = {
      y: e.clientY,
      scrollTop: window.pageYOffset || document.documentElement.scrollTop
    }

    setIsDragging(true)
  }

  // タッチイベント用のハンドラー（passive: falseで登録するため）
  useEffect(() => {
    const thumbElement = thumbRef.current
    if (!thumbElement) return

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // ドラッグ開始時の位置とスクロール位置を記録
      dragStartRef.current = {
        y: e.touches[0].clientY,
        scrollTop: window.pageYOffset || document.documentElement.scrollTop
      }

      setIsDragging(true)
    }

    thumbElement.addEventListener('touchstart', handleTouchStart, { passive: false })

    return () => {
      thumbElement.removeEventListener('touchstart', handleTouchStart)
    }
  }, [isMounted, isVisible])

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      // タッチ開始位置からの移動量を計算
      const deltaY = clientY - dragStartRef.current.y

      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      const maxScroll = scrollHeight - clientHeight

      // 移動量をスクロール量に変換
      const scrollRatio = maxScroll / (clientHeight - scrollbarHeight)
      const newScrollTop = dragStartRef.current.scrollTop + (deltaY * scrollRatio)

      // スクロール位置を設定（範囲内に制限）
      window.scrollTo(0, Math.max(0, Math.min(maxScroll, newScrollTop)))
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, scrollbarHeight])

  if (!isMounted || !isVisible) return null

  const navbarHeight = 56 // h-14 = 56px

  return (
    <div
      ref={scrollbarRef}
      className="fixed left-0 w-3 bg-gray-300/50 dark:bg-gray-600/50 rounded-r-lg sm:hidden"
      style={{
        top: `${navbarHeight}px`,
        height: `calc(100vh - ${navbarHeight}px)`,
        zIndex: 50,
      }}
    >
      <div
        ref={thumbRef}
        className="absolute left-0 w-3 bg-indigo-500 dark:bg-indigo-400 rounded-lg cursor-pointer active:bg-indigo-600 dark:active:bg-indigo-500"
        style={{
          height: `${scrollbarHeight}px`,
          transform: `translateY(${scrollbarTop}px)`,
          transition: isDragging ? 'none' : 'all 0.1s',
        }}
        onMouseDown={handleThumbMouseDown}
      />
    </div>
  )
}

// --- Edit Component ---
function EditTierList({ tierListId, initialVoteId, onCancel, onSaveSuccess }: { tierListId: string, initialVoteId: string, onCancel: () => void, onSaveSuccess: (allowVoting: boolean) => void }) {
  const supabase = createClient()
  const { startLoading, stopLoading } = useLoading()
  const {
    title, description, tiers, unrankedItems, tags, allowVoting,
    setTitle, setDescription, addTier, updateTier, deleteTier,
    addUnrankedItem, addUnrankedTextItem, removeUnrankedItem, updateItemName, updateItemColor, moveItem,
    setAllowVoting,
    deleteItem // New
  } = useTierListStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [croppingFiles, setCroppingFiles] = useState<File[]>([])
  const [currentCroppingIndex, setCurrentCroppingIndex] = useState(0)

  // Validation
  const hasUnrankedItems = unrankedItems.length > 0;
  const hasNoTieredItems = tiers.every(tier => tier.items.length === 0);
  const canPublish = !hasUnrankedItems && !hasNoTieredItems && title.trim().length > 0;

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return
    moveItem(source, destination)
  }

  // Handle item deletion with image cleanup
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('このアイテムを削除してもよろしいですか？')) {
      return
    }

    // Find the item to get its image URL
    const item = [...unrankedItems, ...tiers.flatMap(t => t.items)].find(i => i.id === itemId)

    if (item && item.imageUrl && !item.isTextItem) {
      // Delete image from storage if not used by other tier lists
      // Exclude current tier list from the check since we're editing it
      await deleteImageIfUnused(item.imageUrl, tierListId)
    }

    // Delete item from state
    deleteItem(itemId)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // トリミングUIを表示
    setCroppingFiles(Array.from(files))
    setCurrentCroppingIndex(0)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsSubmitting(true)
    try {
      // Upload to Cloudflare Images via API route
      const formData = new FormData()
      formData.append('file', croppedBlob, `item-${Date.now()}.jpg`)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const { url: imageUrl } = await response.json()

      // ファイル名から拡張子を除いた名前を取得
      const originalFileName = croppingFiles[currentCroppingIndex].name
      const nameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '')

      const newItem: TierItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: nameWithoutExt,
        imageUrl,
      }
      addUnrankedItem(newItem)

      // 次の画像へ
      if (currentCroppingIndex < croppingFiles.length - 1) {
        setCurrentCroppingIndex(currentCroppingIndex + 1)
      } else {
        // すべての画像を処理完了
        setCroppingFiles([])
        setCurrentCroppingIndex(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error("Upload failed", error)
      alert("画像のアップロードに失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCropCancel = () => {
    setCroppingFiles([])
    setCurrentCroppingIndex(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
      if (!title) {
          alert("タイトルを入力してください")
          return
      }

      setIsSubmitting(true)
      startLoading()
      try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error("認証されていません")

          // 1. Update Tier List Info
          const { error: listError } = await supabase
              .from('tier_lists')
              .update({
                  title,
                  description,
                  allow_voting: allowVoting,
                  updated_at: new Date().toISOString()
              })
              .eq('id', tierListId)
          
          if (listError) throw listError

          // 2. Update Tags
          // First, remove existing tags
          await supabase.from('tier_list_tags').delete().eq('tier_list_id', tierListId)
          
          if (tags.length > 0) {
              const tagPromises = tags.map(async (tagName) => {
                  const { data: tagId, error: tagError } = await supabase
                      .rpc('get_or_create_tag', { tag_name: tagName })
                  if (tagError) throw tagError
                  return {
                      tier_list_id: tierListId,
                      tag_id: tagId
                  }
              })
              const relations = await Promise.all(tagPromises)
              const { error: relError } = await supabase.from('tier_list_tags').insert(relations)
              if (relError) throw relError
          }

          // 3. Update Tiers
          // Strategy: Upsert tiers. 
          // Note: Current tiers in store have IDs. If they are 'tier-xxx' (generated by UI), they are new.
          // But existing tiers from DB have UUIDs. 
          // Wait, the store initialization used existing UUIDs for existing tiers.
          // New tiers added in UI get `tier-${Date.now()}`.
          
          // We need to distinguish new vs existing.
          // And we need to handle deletions. The tiers present in `tiers` array are the ones to keep.
          // Others should be deleted.
          
          // Get current tiers from DB to find what to delete
          const { data: dbTiers } = await supabase.from('tiers').select('id').eq('tier_list_id', tierListId)
          const currentTierIds = tiers.map(t => t.id)
          const tiersToDelete = dbTiers?.filter(t => !currentTierIds.includes(t.id) && !t.id.startsWith('tier-')) || []
          
          if (tiersToDelete.length > 0) {
              await supabase.from('tiers').delete().in('id', tiersToDelete.map(t => t.id))
          }

          const tiersUpsertData = tiers.map((t, index) => ({
              id: t.id.startsWith('tier-') ? undefined : t.id, // undefined for new (let DB generate UUID)
              tier_list_id: tierListId,
              name: t.name,
              color: t.color,
              order: index
          }))
          
          // We can't batch upsert mixed new (no ID) and existing (ID) easily if we need the IDs back for items.
          // So we do it one by one or separated.
          // Actually, `upsert` with no ID might fail or create new.
          // Let's Insert new ones and Update existing ones.
          
          // However, we need the Mapping of StoreTierID -> RealDBID for items.
          const tierIdMap: Record<string, string> = {} // storeID -> dbID

          for (const t of tiers) {
              if (t.id.startsWith('tier-')) {
                  const { data: newTier, error } = await supabase.from('tiers').insert({
                      tier_list_id: tierListId,
                      name: t.name,
                      color: t.color,
                      order: tiers.indexOf(t)
                  }).select().single()
                  if (error) throw error
                  tierIdMap[t.id] = newTier.id
              } else {
                  const { error } = await supabase.from('tiers').update({
                      name: t.name,
                      color: t.color,
                      order: tiers.indexOf(t)
                  }).eq('id', t.id)
                  if (error) throw error
                  tierIdMap[t.id] = t.id
              }
          }

          // 4. Update Items
          // Strategy: Similar to tiers.
          // Get existing items to find deletions.
          const { data: dbItems } = await supabase.from('items').select('id').eq('tier_list_id', tierListId)
          
          // Collect all items from store
          const allStoreItems: TierItem[] = []
          tiers.forEach(t => allStoreItems.push(...t.items))
          allStoreItems.push(...unrankedItems)
          
          const currentItemIds = allStoreItems.map(i => i.id)
          // Note: Store items might have temp IDs (if new) or UUIDs (if existing).
          // Typically UI uses random string for new items.
          
          // Items to delete: existing in DB but not in current store (by ID)
          // CAUTION: If we treat all non-UUID IDs as new, that's fine.
          // But we must ensure existing items keep their UUIDs so vote history is preserved.
          
          // How do we know if an ID is a UUID or a temp ID?
          // Existing items loaded from DB have UUIDs. New items have `Math.random...`.
          // We can check if it exists in dbItems.
          const dbItemIds = new Set(dbItems?.map(i => i.id))
          
          const itemsToDelete = dbItems?.filter(i => !currentItemIds.includes(i.id)) || []
          
          if (itemsToDelete.length > 0) {
              await supabase.from('items').delete().in('id', itemsToDelete.map(i => i.id))
              // Vote items cascade delete usually
          }

          // Update/Insert Items
          // We also need to update the Creator's Vote to reflect the new positions.
          // This effectively resets the creator's vote to the current arrangement.
          
          const voteItemsPayload: any[] = []

          for (const item of allStoreItems) {
              const isNew = !dbItemIds.has(item.id)
              let itemId = item.id
              
              const itemData = {
                  tier_list_id: tierListId,
                  name: item.name,
                  image_url: item.imageUrl,
                  background_color: item.backgroundColor,
                  is_text_item: item.isTextItem
              }

              if (isNew) {
                  const { data: newItem, error } = await supabase.from('items').insert(itemData).select().single()
                  if (error) throw error
                  itemId = newItem.id
              } else {
                  const { error } = await supabase.from('items').update(itemData).eq('id', itemId)
                  if (error) throw error
              }

              // Determine Tier for Vote
              // Find which tier this item belongs to in the Store
              let tierId: string | undefined = undefined
              
              if (unrankedItems.find(i => i.id === item.id)) {
                  // Unranked - no vote item (or maybe we should not have unranked items in voting?)
                  // If it's unranked, it's not "voted" for any tier.
              } else {
                  const parentTier = tiers.find(t => t.items.some(i => i.id === item.id))
                  if (parentTier) {
                      tierId = tierIdMap[parentTier.id]
                  }
              }

              if (tierId && initialVoteId) {
                  voteItemsPayload.push({
                      vote_id: initialVoteId,
                      item_id: itemId,
                      tier_id: tierId
                  })
              }
          }

          // Update Creator's Vote
          if (initialVoteId) {
              await supabase.from('vote_items').delete().eq('vote_id', initialVoteId)
              if (voteItemsPayload.length > 0) {
                  await supabase.from('vote_items').insert(voteItemsPayload)
              }
          }

          onSaveSuccess(allowVoting)

      } catch (err: any) {
          console.error("Save error:", err)
          alert("保存に失敗しました: " + err.message)
      } finally {
          setIsSubmitting(false)
          stopLoading()
      }
  }

  return (
      <div className="bg-background mb-8">
          <div className="space-y-4 mb-8">
            <div>
                <label className="block text-sm font-medium mb-1">タイトル(必須)</label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background placeholder:text-red-400"
                    placeholder="タイトルを入力してください。 例: 最強の少年アニメキャラ"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">説明(任意)</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background h-60"
                    placeholder="ティアリストの説明や各階層の基準などを入力してください。"
                />
            </div>
            <TagInput />
            <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="allowVoting"
                    checked={allowVoting}
                    onChange={(e) => setAllowVoting(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="allowVoting" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    このティアリストへの投票を受け付ける。
                </label>
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
              {/* Unranked */}
              <div className="bg-muted/30 border rounded-xl p-4 mb-8">
                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                    <h3 className="font-bold">アイテム ({unrankedItems.length})</h3>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                         <button onClick={addUnrankedTextItem} disabled={unrankedItems.length + tiers.reduce((sum, t) => sum + t.items.length, 0) >= 100} className="flex items-center justify-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"><Type size={14} /> テキストを追加</button>
                         <button onClick={() => fileInputRef.current?.click()} disabled={unrankedItems.length + tiers.reduce((sum, t) => sum + t.items.length, 0) >= 100} className="flex items-center justify-center gap-2 px-3 py-1 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"><Image size={14} /> 画像を追加</button>
                         <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>
                 </div>
                 {unrankedItems.length + tiers.reduce((sum, t) => sum + t.items.length, 0) >= 100 && (
                    <div className="text-sm text-red-600 mb-2">アイテム数は100が上限です。</div>
                 )}
                 <Droppable droppableId="unranked" direction="horizontal">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-wrap gap-2 min-h-[60px] touch-none">
                            {unrankedItems.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="relative w-[68px] h-[68px] sm:w-[102px] sm:h-[102px] group bg-background border rounded overflow-hidden">
                                            <button onClick={() => handleDeleteItem(item.id)} className="absolute top-0 right-0 p-1 bg-red-100 text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10"><X size={12}/></button>
                                            {item.isTextItem ? (
                                                <div className="w-full h-full flex items-center justify-center p-1 relative" style={{ backgroundColor: item.backgroundColor }}>
                                                    <AutocompleteInput value={item.name} onValueChange={(v) => updateItemName(item.id, v)} className="w-full bg-transparent text-xs text-center outline-none" style={{ color: getContrastColor(item.backgroundColor || '#fff') }} placeholder="名無し"/>
                                                    <div className="absolute top-1 left-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-20 cursor-pointer">
                                                        <Pipette size={12} style={{ color: getContrastColor(item.backgroundColor || '#fff') }} />
                                                        <input type="color" value={item.backgroundColor || '#ffffff'} onChange={(e) => updateItemColor(item.id, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <img src={item.imageUrl} className="w-full h-full object-cover" />
                                                    <AutocompleteInput value={item.name} onValueChange={(v) => updateItemName(item.id, v)} className="absolute bottom-0 w-full text-xs bg-black/70 text-white text-center border-none outline-none break-words" placeholder="名無し"/>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                 </Droppable>
                 <div className="text-xs text-muted-foreground mt-2 text-right">アイテムは最大100個まで追加できます。</div>
              </div>

              {/* Tiers */}
              <div className="mb-4 text-sm text-muted-foreground font-medium">
                  ここで作成したティアリストが再投票されます。
              </div>
              <div className="space-y-0 border rounded-md overflow-hidden">
                  {tiers.map((tier) => (
                      <div key={tier.id} className="flex min-h-[68px] sm:min-h-[102px] border-b last:border-0 bg-black">
                          <div className="w-16 sm:w-32 p-2 flex flex-col justify-center items-center relative group" style={{ backgroundColor: tier.color }}>
                              <input
                                  type="text"
                                  value={tier.name}
                                  onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                                  className="text-center font-bold text-lg bg-transparent border-none outline-none w-full"
                                  style={{ color: getContrastColor(tier.color) }}
                                  placeholder="名前"
                              />
                              {/* Color Picker - Left Top */}
                              <div className="absolute top-1 left-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <div className="relative p-1 bg-white/50 rounded hover:bg-white cursor-pointer w-5 h-5 flex items-center justify-center">
                                      <Pipette size={12} />
                                      <input type="color" value={tier.color} onChange={(e) => updateTier(tier.id, { color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                                  </div>
                              </div>
                              {/* Delete Button - Right Top */}
                              <div className="absolute top-1 right-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => deleteTier(tier.id)} className="p-1 bg-white/50 rounded hover:bg-white"><Trash2 size={12}/></button>
                              </div>
                          </div>
                          <Droppable droppableId={tier.id} direction="horizontal">
                              {(provided) => (
                                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 flex flex-wrap bg-[#1a1a1a] touch-none">
                                      {tier.items.map((item, index) => (
                                          <Draggable key={item.id} draggableId={item.id} index={index}>
                                              {(provided) => (
                                                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="relative w-[68px] h-[68px] sm:w-[102px] sm:h-[102px] group">
                                                      <button onClick={() => handleDeleteItem(item.id)} className="absolute top-0 right-0 p-1 bg-red-100 text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10 rounded-bl-md"><X size={12}/></button>
                                                      {item.isTextItem ? (
                                                          <div className="w-full h-full flex items-center justify-center p-1 relative" style={{ backgroundColor: item.backgroundColor }}>
                                                              <AutocompleteInput value={item.name} onValueChange={(v) => updateItemName(item.id, v)} className="w-full bg-transparent text-xs text-center outline-none" style={{ color: getContrastColor(item.backgroundColor || '#fff') }} placeholder="名無し"/>
                                                              <div className="absolute top-1 left-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-20 cursor-pointer">
                                                                  <Pipette size={12} style={{ color: getContrastColor(item.backgroundColor || '#fff') }} />
                                                                  <input type="color" value={item.backgroundColor || '#ffffff'} onChange={(e) => updateItemColor(item.id, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                              </div>
                                                          </div>
                                                      ) : (
                                                          <>
                                                              <img src={item.imageUrl} className="w-full h-full object-cover" />
                                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center"><GripVertical className="text-white"/></div>
                                                              <AutocompleteInput value={item.name} onValueChange={(v) => updateItemName(item.id, v)} className="absolute bottom-0 w-full text-xs bg-black/70 text-white text-center border-none outline-none break-words" placeholder="名無し"/>
                                                          </>
                                                      )}
                                                  </div>
                                              )}
                                          </Draggable>
                                      ))}
                                      {provided.placeholder}
                                  </div>
                              )}
                          </Droppable>
                      </div>
                  ))}
              </div>
              <button onClick={addTier} disabled={tiers.length >= 20} className="w-full mt-4 py-2 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"><Plus size={16} className="mr-2"/> 階層を追加</button>
              {tiers.length >= 20 && (
                <div className="text-sm text-red-600 mt-2">階層数は20が上限です。</div>
              )}
          </DragDropContext>

          <div className="mt-8 flex justify-center gap-4">
              <button onClick={handleSave} disabled={isSubmitting || !canPublish} className="px-10 py-4 rounded-lg font-bold text-lg shadow-lg text-white transition-all bg-indigo-600 hover:scale-105 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:scale-100">
                保存
              </button>
              <button onClick={onCancel} className="px-8 py-2 rounded-lg font-bold text-lg shadow-lg text-white transition-all bg-gray-600 hover:scale-105 hover:bg-gray-700">キャンセル</button>
          </div>

          {/* 画像トリミングモーダル */}
          {croppingFiles.length > 0 && (
            <ImageCropper
              imageFile={croppingFiles[currentCroppingIndex]}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
            />
          )}
      </div>
  )
}


function TierListMetadata({ tierList }: { tierList: any }) {
  return (
    <div className="flex flex-col items-start gap-2 mt-0 mb-1 text-sm text-foreground">
      {tierList.description && ( // Conditionally render description
        <p className="text-foreground text-left whitespace-pre-wrap mt-4 mb-2">{tierList.description}</p>
      )}
      <div className="flex flex-wrap items-center justify-start gap-4">
        <Link href={`/users/${tierList.user_id}/tier-lists`} className="flex items-center gap-2 text-foreground hover:underline hover:text-indigo-600 transition-colors">
          <img src={tierList.users?.avatar_url || '/placeholder-avatar.png'} className="w-5 h-5 rounded-full" alt="creator" />
          <span>作成者: {tierList.users?.full_name || '不明'}</span>
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-start gap-4">
        <span>{format(new Date(tierList.created_at), 'yyyy/MM/dd')}</span>
        <span>{formatNumber(tierList.vote_count)} 票</span>
        <span>{formatNumber(tierList.view_count ?? 0)} 閲覧</span>
      </div>
      {tierList.tier_list_tags && tierList.tier_list_tags.length > 0 && ( // Add tags here
        <div className="flex flex-wrap justify-start gap-2 mt-3">
          {tierList.tier_list_tags.map((t: any) => (
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
  )
}

type ActionButtonsProps = {
  activeTab: 'vote' | 'result' | 'edit' | 'quiz';
  currentUser: any; // TODO: Replace 'any' with a more specific User type if available
  tierList: any; // TODO: Replace 'any' with a more specific TierList type
  isScreenshotLoading: boolean;
  handleShare: () => Promise<void>;
  setIsReportModalOpen: (isOpen: boolean) => void;
  isBanned: boolean;
  handleSaveAsImage: () => void;
  setShowLabels: (show: boolean) => void;
  showLabels: boolean;
}

// --- Action Buttons Component ---
function ActionButtons({ activeTab, currentUser, tierList, isScreenshotLoading, handleShare, setIsReportModalOpen, isBanned, handleSaveAsImage, setShowLabels, showLabels }: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-2">
      {activeTab === 'result' && currentUser ? (
        <Link
          href={`/tier-lists/new?forkFrom=${tierList.id}`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md transition-colors text-white hover:opacity-90 bg-indigo-600 border-indigo-600"
        >
          <Repeat2 size={16} className="sm:hidden" />
          <span className="hidden sm:inline">このティアリストを流用して新規作成</span>
          <span className="sm:hidden">流用作成</span>
        </Link>
      ) : activeTab === 'result' && (
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md transition-colors text-white bg-indigo-600 border-indigo-600 opacity-50 cursor-not-allowed"
          title="ログインが必要です"
        >
          <Repeat2 size={16} className="sm:hidden" />
          <span className="hidden sm:inline">このティアリストを流用して新規作成</span>
          <span className="sm:hidden">流用作成</span>
        </button>
      )}

      {activeTab === 'result' && (
        <button
          onClick={handleShare}
          disabled={isScreenshotLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isNativeApp() ? (
            <Share2 size={20} />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          )}
          <span>{isScreenshotLoading ? '処理中...' : isNativeApp() ? 'シェア' : 'ポスト'}</span>
        </button>
      )}

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
    </div>
  );
}

export default function TierListClientPage({ tierList, tiers, items, userVote, userVoteItems, allVoteItems, currentUser, initialComments, isAdmin = false, isBanned = false, relatedTierLists = [], relatedItems = [], userVotedTierListIds = [] }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { startLoading, stopLoading } = useLoading()
  const [showLabels, setShowLabels] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [voteCount, setVoteCount] = useState<number>(tierList.vote_count)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const tierListRef = useRef<HTMLDivElement>(null)
  const tierListContentRef = useRef<HTMLDivElement>(null)
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false)
  const [itemVoteDist, setItemVoteDist] = useState<Record<string, Record<string, number>> | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [touchedItemId, setTouchedItemId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Detect touch device
  // Note: navigator.maxTouchPoints > 0 can be true on Windows desktop browsers even without touch screens
  // Use pointer: coarse media query for more reliable detection, combined with actual touch event detection
  useEffect(() => {
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    const hasTouchCapability = 'ontouchstart' in window

    // Only set as touch device if both conditions are met (actual touch device)
    // or if a touch event is detected
    setIsTouchDevice(hasCoarsePointer && hasTouchCapability)

    // Also listen for actual touch events to enable touch mode dynamically
    const handleTouchStart = () => {
      setIsTouchDevice(true)
      window.removeEventListener('touchstart', handleTouchStart)
    }
    window.addEventListener('touchstart', handleTouchStart, { once: true })

    return () => window.removeEventListener('touchstart', handleTouchStart)
  }, [])

  // Detect dark mode
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDarkMode(darkModeQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    darkModeQuery.addEventListener('change', handleChange)

    return () => darkModeQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const updateHeight = () => {
      if (containerRef.current) {
          setContainerHeight(containerRef.current.clientHeight)
      }
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [])

  // 結果表示モード（投票後のみ結果タブを表示。ただし投票受付停止中、または未ログインの場合は最初から表示）
  const [isResultMode, setIsResultMode] = useState(
    !tierList.allow_voting || !currentUser || (userVote && userVoteItems && userVoteItems.length > 0)
  )
  
  // Tab Management
  // If voting is not allowed, default to 'quiz'. Else 'vote'.
  // Also check URL parameter 'tab' to restore tab state (e.g., after login)
  const [activeTab, setActiveTab] = useState<'vote' | 'result' | 'edit' | 'quiz'>(() => {
      const tabParam = searchParams.get('tab')
      if (tabParam === 'quiz') return 'quiz'
      if (!tierList.allow_voting) return 'quiz';
      return 'vote';
  })

  // Reset touched item and scroll position when tab changes
  useEffect(() => {
    setTouchedItemId(null)

    // Reset scroll position for vote and quiz tabs
    if (activeTab === 'vote' || activeTab === 'quiz') {
      window.scrollTo(0, 0)
    }
  }, [activeTab])

  // 評価方式の切り替え（結果表示時のみ使用）
  const [evaluationMode, setEvaluationMode] = useState<'absolute' | 'relative'>('absolute')

  // Double tap detection for touch devices
  const [lastTapTime, setLastTapTime] = useState<number>(0)
  const [lastTapItemId, setLastTapItemId] = useState<string | null>(null)

  // Quiz states
  const [quizCorrectAnswers, setQuizCorrectAnswers] = useState<Record<string, string> | null>(null) // { [itemId]: tierId }
  const [quizShuffledItems, setQuizShuffledItems] = useState<Item[]>([])
  const [quizUserPlacements, setQuizUserPlacements] = useState<Record<string, Item | null>>({}) // { [placeholderId]: item }
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({}) // { [placeholderId]: isCorrect }

  // Item size scale for vote and quiz tabs
  const [isDesktop, setIsDesktop] = useState(true)
  const [itemScale, setItemScale] = useState<number>(1)

  // Initialize and update itemScale and isDesktop based on screen size
  useEffect(() => {
    const updateSize = () => {
      const desktop = window.innerWidth >= 640
      setIsDesktop(desktop)
    }

    // Initial setup
    updateSize()

    // Listen for resize
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Load itemScale from localStorage on mount
  useEffect(() => {
    try {
      const savedScale = localStorage.getItem('tierList_itemScale')
      if (savedScale) {
        setItemScale(parseFloat(savedScale))
      }
    } catch (e) {
      console.error('Failed to load itemScale from localStorage', e)
    }
  }, [])

  // Calculate slider background based on current value and dark mode
  const getSliderBackground = useCallback((value: number) => {
    const percentage = ((value - 0.5) / (2 - 0.5)) * 100
    const activeColor = 'rgb(79 70 229)' // indigo-600
    const inactiveColor = isDarkMode ? 'rgb(55 65 81)' : 'rgb(229 231 235)' // gray-700 : gray-200
    return `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percentage}%, ${inactiveColor} ${percentage}%, ${inactiveColor} 100%)`
  }, [isDarkMode])

  const handleItemScaleChange = (newScale: number) => {
    setItemScale(newScale)
    try {
      localStorage.setItem('tierList_itemScale', newScale.toString())
    } catch (e) {
      console.error('Failed to save itemScale to localStorage', e)
    }
  }

  const [displayedRelatedLists, setDisplayedRelatedLists] = useState<any[]>(relatedTierLists || []);
  const [displayedRelatedItems, setDisplayedRelatedItems] = useState<any[]>(relatedItems || []);

  // Update URL parameter when activeTab changes to 'quiz'
  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search)
    const currentTab = currentParams.get('tab')

    if (activeTab === 'quiz' && currentTab !== 'quiz') {
      currentParams.set('tab', 'quiz')
      const newUrl = `${window.location.pathname}?${currentParams.toString()}`
      window.history.replaceState({}, '', newUrl)
    } else if (activeTab !== 'quiz' && currentTab === 'quiz') {
      currentParams.delete('tab')
      const newUrl = currentParams.toString()
        ? `${window.location.pathname}?${currentParams.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [activeTab])

  useEffect(() => {
    if (!relatedTierLists || relatedTierLists.length === 0) {
        setDisplayedRelatedLists([]);
        return;
    }

    const list = [...relatedTierLists];
    const amazonAds = [
        { isAmazonBookAd: true },
        { isAmazonFurusatoAd: true },
        { isAmazonRankingAd: true },
        { isAmazonTimesaleAd: true }
    ];
    // Select one random ad type
    const randomAd = amazonAds[Math.floor(Math.random() * amazonAds.length)];

    // Insert at random position
    const randomIndex = Math.floor(Math.random() * (list.length + 1));
    list.splice(randomIndex, 0, randomAd);

    setDisplayedRelatedLists(list);
  }, [relatedTierLists]);

  useEffect(() => {
    if (!relatedItems || relatedItems.length === 0) {
        setDisplayedRelatedItems([]);
        return;
    }

    // Deduplicate by item_name (in case SQL doesn't fully deduplicate)
    const uniqueMap = new Map();
    relatedItems.forEach((item: any) => {
        if (!uniqueMap.has(item.item_name)) {
            uniqueMap.set(item.item_name, item);
        }
    });
    const list = Array.from(uniqueMap.values());

    const amazonAds = [
        { isAmazonBookAd: true },
        { isAmazonFurusatoAd: true },
        { isAmazonRankingAd: true },
        { isAmazonTimesaleAd: true }
    ];
    // Select one random ad type
    const randomAd = amazonAds[Math.floor(Math.random() * amazonAds.length)];

    // Insert at random position
    const randomIndex = Math.floor(Math.random() * (list.length + 1));
    list.splice(randomIndex, 0, randomAd);

    setDisplayedRelatedItems(list);
  }, [relatedItems]);

  useEffect(() => {
    // Save to recently viewed
    const saveToHistory = () => {
      try {
        const historyKey = 'viewedTierLists'
        const maxHistory = 10
        const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')
        
        // Remove current ID if exists (to move it to top)
        const newHistory = currentHistory.filter((id: string) => id !== tierList.id)
        
        // Add to front
        newHistory.unshift(tierList.id)
        
        // Limit size
        if (newHistory.length > maxHistory) {
          newHistory.pop()
        }
        
        localStorage.setItem(historyKey, JSON.stringify(newHistory))
      } catch (e) {
        console.error('Failed to save history', e)
      }
    }
    saveToHistory()
  }, [tierList.id])

  const handleSaveAsImage = async () => {
    const element = document.getElementById('tier-list-content')
    if (!element) return
    
    setIsScreenshotLoading(true)
    try {
        const dataUrl = await domToPng(element, {
            backgroundColor: getComputedStyle(document.body).backgroundColor,
            scale: 2 // Improve quality
        })
        const link = document.createElement('a')
        link.download = `${tierList.title}_tierlist.png`
        link.href = dataUrl
        link.click()
    } catch (err) {
        console.error(err)
        alert("画像の保存に失敗しました")
    } finally {
        setIsScreenshotLoading(false)
    }
  }

  const handleShare = async () => {
    // Determine action text based on ownership and voting status
    const isOwner = currentUser?.id === tierList.user_id
    const actionText = isOwner
      ? 'を作成しました。'
      : tierList.allow_voting
        ? ' に投票しました。'
        : 'を共有します。'
    const statusText = tierList.allow_voting ? '投票受付中👇\n' : '公開中👇\n'

    // Get tags from tier list
    const tierListTags = tierList.tier_list_tags?.map((t: any) => t.tags?.name).filter(Boolean) || []

    // Start with title and action
    let shareText = `#${tierList.title}${actionText}\n\n`

    // Build hashtags string
    let hashtags = '#ティアリストcom #ティア表 #ティアリスト #Tier表 #Tierリスト #TierList'

    // Add tier list tags
    for (const tag of tierListTags) {
      const newHashtag = ` #${tag}`
      hashtags += newHashtag
    }

    // Twitter character limit is 280, URLs count as ~23 characters
    // Use conservative limit (250) to be safe with multi-byte characters and URL length
    const maxLength = 250

    // Combine text and hashtags, trim if necessary
    let fullText = shareText + hashtags + '\n\n' + statusText

    if (fullText.length > maxLength) {
      // Trim hashtags if text is too long
      const baseTextLength = shareText.length + '#ティアリストcom\n\n'.length + statusText.length
      const availableLength = maxLength - baseTextLength

      if (availableLength > 0) {
        hashtags = '#ティアリストcom'
        for (const tag of tierListTags) {
          const newHashtag = ` #${tag}`
          if ((hashtags + newHashtag).length <= availableLength) {
            hashtags += newHashtag
          } else {
            break
          }
        }
        fullText = shareText + hashtags + '\n\n' + statusText
      } else {
        fullText = shareText + '\n\n' + statusText
      }
    }

    // ネイティブアプリの場合はOSのシェアメニューを使用
    if (isNativeApp()) {
      const success = await shareContent({
        title: tierList.title,
        text: fullText,
        url: window.location.href
      })

      if (success) return // シェア成功
      // 失敗した場合は下のTwitter実装にフォールバック
    }

    // Webの場合（または失敗時）はTwitterのツイート画面を開く
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(fullText)}`
    window.open(twitterUrl, '_blank', 'noopener,noreferrer')
  }

  type VotingState = {
    tiers: Record<string, Item[]>
    unranked: Item[]
  }

  const [votingState, setVotingState] = useState<VotingState>(() => {
    const initialTiers: Record<string, Item[]> = {}
    tiers.forEach(t => initialTiers[t.id] = [])
    const middleTierIndex = Math.floor(tiers.length / 2)
    const middleTierId = tiers[middleTierIndex]?.id || tiers[0]?.id

    // userVote（投票済み）がある場合のみ userVoteItems を反映
    if (userVote && userVoteItems && userVoteItems.length > 0) {
      items.forEach(item => {
        const vItem = userVoteItems.find((vi: any) => vi.item_id === item.id)
        if (vItem && initialTiers[vItem.tier_id]) {
          initialTiers[vItem.tier_id].push(item)
        } else if (middleTierId) {
          initialTiers[middleTierId].push(item)
        }
      })
      return { tiers: initialTiers, unranked: [] }
    }

    // 未投票の場合はすべてunrankedに配置（localStorageからの復元はuseEffect内で行う）
    return { tiers: initialTiers, unranked: [...items] }
  })

  useEffect(() => {
    const initialTiers: Record<string, Item[]> = {}
    tiers.forEach(t => initialTiers[t.id] = [])
    const middleTierIndex = Math.floor(tiers.length / 2)
    const middleTierId = tiers[middleTierIndex]?.id || tiers[0]?.id

    if (userVote && userVoteItems && userVoteItems.length > 0) {
      items.forEach(item => {
        const vItem = userVoteItems.find((vi: any) => vi.item_id === item.id)
        if (vItem && initialTiers[vItem.tier_id]) {
          initialTiers[vItem.tier_id].push(item)
        } else if (middleTierId) {
          initialTiers[middleTierId].push(item)
        }
      })
      setVotingState({ tiers: initialTiers, unranked: [] })
    } else {
      // 外部から遷移してきた場合（ログイン直後以外）はlocalStorageをクリア
      const storageKey = `tierlist-${tierList.id}-guest-vote`
      const sessionKey = `tierlist-${tierList.id}-last-visit`
      const currentTime = Date.now()

      // セッション情報を確認
      const lastVisit = sessionStorage.getItem(sessionKey)
      const isReturningFromAuth = sessionStorage.getItem('just-authenticated') === 'true'

      // 認証フラグを確認したらクリア（1回のみ使用）
      if (isReturningFromAuth) {
        sessionStorage.removeItem('just-authenticated')
      }

      // 新規訪問（セッションがない、または30秒以上経過）かつ認証後でない場合、localStorageをクリア
      if (!isReturningFromAuth && (!lastVisit || (currentTime - parseInt(lastVisit)) > 30000)) {
        localStorage.removeItem(storageKey)
      }

      // 現在の訪問時刻を記録
      sessionStorage.setItem(sessionKey, currentTime.toString())

      // 未投票の場合、localStorageから配置を復元
      try {
        const savedState = localStorage.getItem(storageKey)
        if (savedState) {
          const parsed = JSON.parse(savedState)
          const itemsMap = new Map(items.map(item => [item.id, item]))

          Object.entries(parsed.tiers || {}).forEach(([tierId, itemIds]) => {
            if (initialTiers[tierId]) {
              (itemIds as string[]).forEach(itemId => {
                const item = itemsMap.get(itemId)
                if (item) {
                  initialTiers[tierId].push(item)
                  itemsMap.delete(itemId)
                }
              })
            }
          })

          const unrankedItems: Item[] = []
          if (parsed.unranked) {
            (parsed.unranked as string[]).forEach(itemId => {
              const item = itemsMap.get(itemId)
              if (item) {
                unrankedItems.push(item)
                itemsMap.delete(itemId)
              }
            })
          }

          itemsMap.forEach(item => unrankedItems.push(item))
          setVotingState({ tiers: initialTiers, unranked: unrankedItems })
          return
        }
      } catch (e) {
        console.error('Failed to load saved state from localStorage', e)
      }

      // 保存された配置がない場合 → すべて未配置に配置（シャッフル）
      const shuffledItems = [...items].sort(() => Math.random() - 0.5)
      setVotingState({ tiers: initialTiers, unranked: shuffledItems })
    }
  }, [items, tiers, userVote, userVoteItems, tierList.id])

  // 未投票時にvotingStateが変更されたらlocalStorageに保存
  useEffect(() => {
    // 投票済みの場合は保存しない
    if (userVote && userVoteItems && userVoteItems.length > 0) {
      return
    }

    try {
      const storageKey = `tierlist-${tierList.id}-guest-vote`
      const saveData = {
        tiers: Object.fromEntries(
          Object.entries(votingState.tiers).map(([tierId, items]) => [
            tierId,
            items.map(item => item.id)
          ])
        ),
        unranked: votingState.unranked.map(item => item.id)
      }
      localStorage.setItem(storageKey, JSON.stringify(saveData))
    } catch (e) {
      console.error('Failed to save state to localStorage', e)
    }
  }, [votingState, userVote, userVoteItems, tierList.id])

  const [results, setResults] = useState<Record<string, Item[]> | null>(null)
  const [voteStats, setVoteStats] = useState<Record<string, { total: number, count: number }> | null>(null)
  const [loadingResults, setLoadingResults] = useState(false)

  const handleItemDoubleClick = (item: Item) => {
    if (activeTab === 'vote') return
    if (!item.name || item.name === '名無し') return
    console.log('[TierList] Item double-clicked, starting loading indicator')
    startLoading()
    router.push(`/items/${encodeURIComponent(item.name)}`)
  }

  // 投票統計の取得（結果表示時のみ）
  useEffect(() => {
    if ((activeTab === 'result' || activeTab === 'quiz') && !voteStats) {
      setLoadingResults(true)
      const fetchResults = async () => {
        const { data: voteIds } = await supabase.from('votes').select('id').eq('tier_list_id', tierList.id)
        if (!voteIds || voteIds.length === 0) {
          setVoteStats({})
          setItemVoteDist({})
          setLoadingResults(false)
          return
        }
        const ids = voteIds.map(v => v.id)
        const { data: voteItems } = await supabase.from('vote_items').select('item_id, tier_id').in('vote_id', ids)

        if (!voteItems || voteItems.length === 0) {
          setVoteStats({})
          setItemVoteDist({})
          setLoadingResults(false)
          return
        }

        const tierScoreMap: Record<string, number> = {}
        const numTiers = tiers.length
        const medianIndex = (numTiers - 1) / 2
        tiers.forEach((t, idx) => {
          tierScoreMap[t.id] = medianIndex - idx
        })

        const itemScores: Record<string, { total: number, count: number }> = {}
        const itemDist: Record<string, Record<string, number>> = {}
        voteItems.forEach((vi: any) => {
          if (!itemScores[vi.item_id]) itemScores[vi.item_id] = { total: 0, count: 0 }
          const score = tierScoreMap[vi.tier_id] || 0
          itemScores[vi.item_id].total += score
          itemScores[vi.item_id].count += 1

          if (!itemDist[vi.item_id]) itemDist[vi.item_id] = {}
          if (!itemDist[vi.item_id][vi.tier_id]) itemDist[vi.item_id][vi.tier_id] = 0
          itemDist[vi.item_id][vi.tier_id] += 1
        })
        setVoteStats(itemScores)
        setItemVoteDist(itemDist)
        setLoadingResults(false)
      }
      fetchResults()
    }
  }, [activeTab, voteStats, supabase, tierList.id, tiers])

  // 結果の計算（evaluationMode に応じて切り替え）
  useEffect(() => {
    if (!voteStats || (activeTab !== 'result' && activeTab !== 'quiz')) {
      setResults(null)
      return
    }

    const numTiers = tiers.length
    const calculatedTiers: Record<string, Item[]> = {}
    tiers.forEach(t => calculatedTiers[t.id] = [])

    const sortedItems = [...items].sort((a, b) => {
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
        const targetTier = tiers[tierIdx]
        calculatedTiers[targetTier.id].push(item)
      })
    } else {
      // 相対評価
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
          const targetTier = tiers[tierIdx]
          calculatedTiers[targetTier.id].push(item)
        })
      } else {
        const middleIndex = Math.floor((numTiers - 1) / 2)
        sortedItems.forEach(item => {
          calculatedTiers[tiers[middleIndex].id].push(item)
        })
      }
    }
    setResults(calculatedTiers)
  }, [activeTab, evaluationMode, voteStats, items, tiers])

  // Quiz Initializer
  useEffect(() => {
    if (activeTab === 'quiz' && !quizCorrectAnswers) {
      if (results) {
        const answers: Record<string, string> = {}
        const placements: Record<string, Item | null> = {}
        Object.entries(results).forEach(([tierId, tierItems]) => {
          tierItems.forEach((item, index) => {
            answers[item.id] = tierId
            // Use a unique placeholder ID that combines tier and item info
            placements[`${tierId}-${item.id}`] = null
          })
        })
        setQuizCorrectAnswers(answers)

        // Try to restore from localStorage
        try {
          const placementsKey = `tierlist-${tierList.id}-quiz-placements`
          const shuffledKey = `tierlist-${tierList.id}-quiz-shuffled`
          const savedPlacements = localStorage.getItem(placementsKey)
          const savedShuffled = localStorage.getItem(shuffledKey)
          const justLoggedIn = searchParams.get('just_logged_in') === 'true'

          if (savedPlacements && savedShuffled && justLoggedIn) {
            const parsedPlacements = JSON.parse(savedPlacements)
            const parsedShuffled = JSON.parse(savedShuffled) as string[]

            // Restore placements
            const restoredPlacements: Record<string, Item | null> = { ...placements }
            const itemsMap = new Map(items.map(item => [item.id, item]))
            const placedItemIds = new Set<string>()

            Object.entries(parsedPlacements).forEach(([placeholderId, itemId]) => {
              if (itemId && typeof itemId === 'string') {
                const item = itemsMap.get(itemId)
                if (item && restoredPlacements.hasOwnProperty(placeholderId)) {
                  restoredPlacements[placeholderId] = item
                  placedItemIds.add(itemId)
                }
              }
            })

            // Restore shuffled items (only unplaced items)
            const restoredShuffled = parsedShuffled
              .map(itemId => itemsMap.get(itemId))
              .filter((item): item is Item => item !== undefined && !placedItemIds.has(item.id))

            setQuizUserPlacements(restoredPlacements)
            setQuizShuffledItems(restoredShuffled)
            setQuizResults({})
            return
          }
        } catch (e) {
          console.error('Failed to restore quiz state from localStorage', e)
        }

        // No saved state, initialize normally
        const shuffled = [...items].sort(() => Math.random() - 0.5)
        setQuizShuffledItems(shuffled)
        setQuizUserPlacements(placements)
        setQuizResults({})
      }
    }
  }, [activeTab, results, items, quizCorrectAnswers, tierList.id])
  
  const handleCheckAnswer = () => {
      if (!quizCorrectAnswers || !results) return
      const newQuizResults: Record<string, boolean> = {}

      Object.entries(results).forEach(([tierId, tierItems]) => {
          tierItems.forEach(originalItem => {
              const placeholderId = `${tierId}-${originalItem.id}`
              const placedItem = quizUserPlacements[placeholderId]

              if (placedItem) {
                  const placedItemCorrectTierId = quizCorrectAnswers[placedItem.id]
                  newQuizResults[placeholderId] = placedItemCorrectTierId === tierId
              }
          })
      })

      setQuizResults(newQuizResults)
  }

  // Save quiz placements to localStorage
  useEffect(() => {
    if (!quizCorrectAnswers) return // Quiz not initialized yet

    try {
      const placementsKey = `tierlist-${tierList.id}-quiz-placements`
      const shuffledKey = `tierlist-${tierList.id}-quiz-shuffled`

      // Save placements (only item IDs)
      const placementsToSave: Record<string, string | null> = {}
      Object.entries(quizUserPlacements).forEach(([placeholderId, item]) => {
        placementsToSave[placeholderId] = item ? item.id : null
      })
      localStorage.setItem(placementsKey, JSON.stringify(placementsToSave))

      // Save shuffled items (only IDs)
      const shuffledIds = quizShuffledItems.map(item => item.id)
      localStorage.setItem(shuffledKey, JSON.stringify(shuffledIds))
    } catch (e) {
      console.error('Failed to save quiz state to localStorage', e)
    }
  }, [quizUserPlacements, quizShuffledItems, quizCorrectAnswers, tierList.id])

  const onDragStart = (start: any) => {
    if (isTouchDevice && !showLabels) {
      setTouchedItemId(start.draggableId)
    }
  }

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!destination) return

    if (activeTab === 'vote') {
        if (source.droppableId === destination.droppableId && source.index === destination.index) return
        setVotingState((prev: VotingState) => {
            const newState = { ...prev, tiers: { ...prev.tiers } }

            if (source.droppableId === destination.droppableId) {
                const list = source.droppableId === 'unranked' ? [...prev.unranked] : [...prev.tiers[source.droppableId] ?? []]
                const [movedItem] = list.splice(source.index, 1)
                list.splice(destination.index, 0, movedItem)

                if (source.droppableId === 'unranked') {
                    newState.unranked = list
                } else {
                    newState.tiers[source.droppableId] = list
                }
            } else {
                const sourceList = source.droppableId === 'unranked' ? [...prev.unranked] : [...prev.tiers[source.droppableId] ?? []]
                const destList = destination.droppableId === 'unranked' ? [...prev.unranked] : [...prev.tiers[destination.droppableId] ?? []]
                const [movedItem] = sourceList.splice(source.index, 1)
                destList.splice(destination.index, 0, movedItem)

                if (source.droppableId === 'unranked') {
                    newState.unranked = sourceList
                } else {
                    newState.tiers[source.droppableId] = sourceList
                }

                if (destination.droppableId === 'unranked') {
                    newState.unranked = destList
                } else {
                    newState.tiers[destination.droppableId] = destList
                }
            }
            return newState
        })
    } else if (activeTab === 'quiz') {
        const { source, destination } = result;
        if (!destination) return;
        
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Prevent dropping on a correct answer
        if (destination.droppableId !== 'quiz-unranked' && quizResults[destination.droppableId]) {
            return;
        }

        const newPlacements = { ...quizUserPlacements };
        const newShuffledItems = [...quizShuffledItems];

        let draggedItem: Item | undefined;

        // 1. Extract from Source
        if (source.droppableId === 'quiz-unranked') {
            const index = newShuffledItems.findIndex(i => i.id === result.draggableId);
            if (index !== -1) {
                draggedItem = newShuffledItems[index];
                newShuffledItems.splice(index, 1);
            }
        } else {
            // Source is a placeholder
            draggedItem = newPlacements[source.droppableId] || undefined;
            newPlacements[source.droppableId] = null; // Clear source
        }

        if (!draggedItem) return;

        // 2. Insert into Destination
        if (destination.droppableId === 'quiz-unranked') {
            // Return to unranked
            newShuffledItems.splice(destination.index, 0, draggedItem);
        } else {
            // Destination is a placeholder
            const displacedItem = newPlacements[destination.droppableId];
            newPlacements[destination.droppableId] = draggedItem;

            if (displacedItem) {
                // Handle displaced item
                if (source.droppableId === 'quiz-unranked') {
                    // If dragged item came from unranked, push displaced item to unranked
                    newShuffledItems.push(displacedItem); 
                } else {
                    // If dragged item came from another placeholder, swap!
                    // Put the displaced item into the source placeholder
                    newPlacements[source.droppableId] = displacedItem;
                }
            }
        }

        setQuizUserPlacements(newPlacements);
        setQuizShuffledItems(newShuffledItems);

        // Reset quiz results for affected placeholders
        setQuizResults(prev => {
            const next = { ...prev };
            if (source.droppableId !== 'quiz-unranked') {
                delete next[source.droppableId];
            }
            if (destination.droppableId !== 'quiz-unranked') {
                delete next[destination.droppableId];
            }
            return next;
        });
    }
  }

  const handleVote = async () => {
    if (!currentUser) {
      alert("投票するにはログインしてください！")
      return
    }
    setIsSubmitting(true)
    startLoading()
    try {
      // vote_items のペイロードを準備
      const voteItemsPayload: any[] = []
      Object.entries(votingState.tiers).forEach(([tierId, tierItems]) => {
        tierItems.forEach(item => {
          voteItemsPayload.push({
            item_id: item.id,
            tier_id: tierId
          })
        })
      })

      // サーバーアクションを呼び出し（プッシュ通知も自動送信される）
      const result = await submitVote(tierList.id, voteItemsPayload)

      if (result.error) {
        alert('投票に失敗しました: ' + result.error)
        return
      }

      // 新規投票の場合のみカウントを増やす
      if (!userVote) {
        setVoteCount((prev: number) => prev + 1)
      }

      // 投票成功後、localStorageから保存された配置を削除
      try {
        const storageKey = `tierlist-${tierList.id}-guest-vote`
        localStorage.removeItem(storageKey)
      } catch (e) {
        console.error('Failed to remove saved state from localStorage', e)
      }

      alert("投票しました！")
      router.refresh()

      // 投票（再投票）成功後だけ結果タブに自動遷移
      setIsResultMode(true)
      setActiveTab('result')
      setEvaluationMode('absolute')

    } catch (err: any) {
      console.error(err)
      alert("投票に失敗しました: " + err.message)
    } finally {
      setIsSubmitting(false)
      stopLoading()
    }
  }

  const handleEditClick = () => {
    const storeTiers: StoreTier[] = tiers.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      items: []
    }))

    const storeUnranked: TierItem[] = []
    const tierMap = new Map(storeTiers.map(t => [t.id, t]))

    const existingTags = tierList.tier_list_tags?.map((t: any) => t.tags?.name).filter(Boolean) || []

    items.forEach(item => {
      const tierItem: TierItem = {
        id: item.id,
        name: item.name,
        imageUrl: item.image_url,
        backgroundColor: item.background_color,
        isTextItem: item.is_text_item
      }

      const vItem = userVoteItems?.find((vi: any) => vi.item_id === item.id)
      if (vItem && tierMap.has(vItem.tier_id)) {
        tierMap.get(vItem.tier_id)!.items.push(tierItem)
      } else {
        storeUnranked.push(tierItem)
      }
    })

    useTierListStore.getState().initialize({
      title: tierList.title,
      description: tierList.description || '',
      tiers: storeTiers,
      unrankedItems: storeUnranked,
      tags: existingTags,
      allowVoting: tierList.allow_voting // Initialize allowVoting
    })

    setActiveTab('edit')
  }

    // Check if there are any placed items that haven't been graded yet
    const hasUngradedPlacedItems = Object.entries(quizUserPlacements).some(([key, item]) => item !== null && quizResults[key] === undefined);

    // Calculate scaled sizes for items and tier names
    const itemSize = isDesktop ? 102 * itemScale : 68 * itemScale
    const tierNameWidth = isDesktop ? 128 : 64

    return (
    <div ref={containerRef} className="container mx-auto py-4 px-4 max-w-5xl relative">
      <RakutenLeftWidget containerHeight={containerHeight} uniqueKey={tierList.id} />
      <RakutenRightWidget containerHeight={containerHeight} uniqueKey={tierList.id} />
      <BackButton />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4">
        <h1 className="text-3xl font-bold my-0 m-0 p-0">{tierList.title}</h1>
      </div>

      <div className="flex border-b mb-0 items-end overflow-x-auto">
        <div className="flex gap-1 whitespace-nowrap">
          {/* 常に「投票」タブを表示（投票済みでも再投票可能にするため）。ただし allow_voting が false の場合は非表示 */}
          {tierList.allow_voting && (
              <button
                onClick={() => {
                  setActiveTab('vote')
                  setSelectedItemId(null)
                  window.scrollTo(0, 0)
                }}
                className={`px-4 py-0 font-medium text-sm transition-colors border-b-2 ${activeTab === 'vote' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                投票
              </button>
          )}

          <button
            onClick={() => {
              setActiveTab('quiz')
              setSelectedItemId(null)
              window.scrollTo(0, 0)
            }}
            className={`px-4 py-0 font-medium text-sm transition-colors border-b-2 ${activeTab === 'quiz' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            クイズ
          </button>

          {/* 投票済みの場合のみ「結果」タブを表示 */}
          {isResultMode && (
            <button
              onClick={() => {
                setActiveTab('result')
                setSelectedItemId(null)
                window.scrollTo(0, 0)
              }}
              className={`px-4 py-0 font-medium text-sm transition-colors border-b-2 ${activeTab === 'result' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              結果
            </button>
          )}

          {currentUser?.id === tierList.user_id && (
            <button
              onClick={() => {
                handleEditClick()
                setSelectedItemId(null)
                window.scrollTo(0, 0)
              }}
              className={`px-4 py-0 font-medium text-sm transition-colors border-b-2 ${activeTab === 'edit' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              編集
            </button>
          )}
        </div>
      </div>

      <div id="tier-list-container" ref={tierListRef}>

        {activeTab === 'edit' ? (
          <EditTierList 
            tierListId={tierList.id} 
            initialVoteId={userVote?.id || ''}
            onCancel={() => setActiveTab('vote')}
            onSaveSuccess={(allowVoting) => { 
                router.refresh(); 
                if (allowVoting) {
                    setActiveTab('vote'); 
                } else {
                    setActiveTab('quiz');
                }
            }}
          />
        ) : (
          <div className="bg-background">
            {activeTab === 'vote' ? (
              <>
              <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="space-y-1 mb-4 sm:p-1">
                  <div className="space-y-2">
                    <div className="mt-2 mb-1 text-left text-sm text-muted-foreground">
                        あなたが考えたティアリストを投票しましょう。<br />
                        全アイテムを配置してから投票してください。
                    </div>
                    {/* Item Size Slider */}
                    <div className="flex items-center gap-3 px-4 py-1 mt-0 mb-1">
                      <button 
                        onClick={() => setShowLabels(!showLabels)}
                        className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-md hover:bg-accent transition-colors whitespace-nowrap w-[90px] shrink-0 flex justify-center"
                      >
                        {showLabels ? '名前を非表示' : '名前を表示'}
                      </button>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.01"
                        value={itemScale}
                        onChange={(e) => handleItemScaleChange(parseFloat(e.target.value))}
                        style={{
                          background: getSliderBackground(itemScale)
                        }}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:border-0"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                        {Math.round(itemScale * 100)}%
                      </span>
                    </div>
                    <div id="tier-list-content" ref={tierListContentRef} className="flex flex-col">
                        {tiers.map((tier) => (
                        <div key={tier.id} className="flex border-b border-x first:border-t overflow-hidden bg-white dark:bg-zinc-900" style={{ minHeight: `${itemSize}px` }}>
                        <div className="flex justify-center items-center p-2 text-center font-bold text-sm sm:text-xl break-words line-clamp-3" style={{ width: `${tierNameWidth}px`, backgroundColor: tier.color, color: getContrastColor(tier.color), touchAction: 'pan-y' }}>
                                {tier.name}
                              </div>
                              <Droppable droppableId={tier.id} direction="horizontal">
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 flex flex-wrap gap-0 p-0 transition-colors ${snapshot.isDraggingOver ? 'bg-red-600' : 'bg-[#1a1a1a]'} touch-none`}
                                  >
                                    {votingState.tiers[tier.id]?.map((item, index) => (
                                      <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className="relative group cursor-grab active:cursor-grabbing"
                                            style={{
                                              ...provided.draggableProps.style,
                                              width: `${itemSize}px`,
                                              height: `${itemSize}px`
                                            }}
                                            onClick={() => {
                                              if (isTouchDevice && !showLabels) {
                                                setTouchedItemId(touchedItemId === item.id ? null : item.id)
                                              }
                                            }}
                                            onDoubleClick={() => handleItemDoubleClick(item)}
                                          >
                                            {item.is_text_item ? (
                                              <div 
                                                className="w-full h-full rounded shadow-sm flex items-center justify-center p-2 text-xs text-center"
                                                style={{ backgroundColor: item.background_color || '#3b82f6', color: getContrastColor(item.background_color || '#3b82f6') }}
                                              >
                                                {item.name}
                                              </div>
                                            ) : (
                                              <>
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded shadow-sm"/>
                                                <div className={`absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-0.5 px-1 break-words ${
                                                  showLabels
                                                    ? ''
                                                    : isTouchDevice
                                                      ? (touchedItemId === item.id ? '' : 'opacity-0')
                                                      : 'opacity-0 group-hover:opacity-100 transition-opacity'
                                                }`}>{item.name}</div>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                        ))}
                  </div>

                  <div>
                      <Droppable droppableId="unranked" direction="horizontal">
                        {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-2 border-2 border-solid rounded-md flex flex-wrap gap-2 ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-100/20' : ''} touch-none`}
                              style={{ touchAction: 'none', minHeight: votingState.unranked.length === 0 ? `${itemSize / 2}px` : undefined }}
                            >
                                {votingState.unranked.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided) => (
                                           <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className="relative group cursor-grab active:cursor-grabbing"
                                              style={{
                                                ...provided.draggableProps.style,
                                                width: `${itemSize}px`,
                                                height: `${itemSize}px`
                                              }}
                                              onClick={() => {
                                                if (isTouchDevice && !showLabels) {
                                                  setTouchedItemId(touchedItemId === item.id ? null : item.id)
                                                }
                                              }}
                                              onDoubleClick={() => handleItemDoubleClick(item)}
                                            >
                                              {item.is_text_item ? (
                                                <div
                                                  className="w-full h-full rounded shadow-sm flex items-center justify-center p-2 text-xs text-center"
                                                  style={{ backgroundColor: item.background_color || '#3b82f6', color: getContrastColor(item.background_color || '#3b82f6') }}
                                                >
                                                  {item.name}
                                                </div>
                                              ) : (
                                                <>
                                                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded shadow-sm"/>
                                                  <div className={`absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-0.5 px-1 break-words ${
                                                    showLabels
                                                      ? ''
                                                      : isTouchDevice
                                                        ? (touchedItemId === item.id ? '' : 'opacity-0')
                                                        : 'opacity-0 group-hover:opacity-100 transition-opacity'
                                                  }`}>{item.name}</div>
                                                </>
                                              )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                      </Droppable>
                  </div>
                  </div>

                  <div className="mt-2 flex justify-center gap-4">
                    <button
                      onClick={handleVote}
                      disabled={isSubmitting || !currentUser || votingState.unranked.length > 0}
                      className="px-6 py-4 rounded-lg font-bold text-lg shadow-lg text-white transition-all bg-indigo-600 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed leading-tight"
                      title={!currentUser ? "ログインが必要です" : votingState.unranked.length > 0 ? "全てのアイテムを配置してください" : undefined}
                    >
                      {!currentUser ? (
                        <div className="flex flex-col items-center">
                          <span>投票</span>
                          <span className="text-xs font-normal opacity-90 mt-0.5">ログインが必要です</span>
                        </div>
                      ) : userVote ? (
                        '再投票'
                      ) : (
                        '投票'
                      )}
                    </button>
                    <button
                        onClick={() => { setIsResultMode(true); setActiveTab('result'); setEvaluationMode('absolute'); window.scrollTo(0, 0); }}
                        className="px-8 py-2 rounded-lg font-bold text-lg shadow-lg text-white transition-all bg-gray-600 hover:scale-105 hover:bg-gray-700"
                    >
                        結果を見る
                    </button>
                  </div>
                  <TierListMetadata tierList={tierList} />
                  <ActionButtons {...{ currentUser, tierList, isScreenshotLoading, handleShare, setIsReportModalOpen, isBanned, handleSaveAsImage, setShowLabels, showLabels, activeTab }} />
                </div>
              </DragDropContext>
              <PageScrollbar />
              </>
            ) : activeTab === 'quiz' ? (
              <>
              <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="space-y-1 mb-4 sm:p-1">
                    <div className="space-y-2">
                    <div className="mt-2 mb-1 text-left text-sm text-muted-foreground">
                        ティアリストの投票結果を予想しましょう。<br />
                        ?にアイテムを配置して解答を押してください。
                    </div>
                    {/* Item Size Slider */}
                    <div className="flex items-center gap-3 px-4 py-1 my-0">
                      <button 
                        onClick={() => setShowLabels(!showLabels)}
                        className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-md hover:bg-accent transition-colors whitespace-nowrap w-[90px] shrink-0 flex justify-center"
                      >
                        {showLabels ? '名前を非表示' : '名前を表示'}
                      </button>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.01"
                        value={itemScale}
                        onChange={(e) => handleItemScaleChange(parseFloat(e.target.value))}
                        style={{
                          background: getSliderBackground(itemScale)
                        }}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:border-0"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                        {Math.round(itemScale * 100)}%
                      </span>
                    </div>
                    <div id="tier-list-content" ref={tierListContentRef} className="space-y-4">
                        <div className="flex flex-col">
                            {tiers.map((tier) => (
                                <div key={tier.id} className="flex border-b border-x first:border-t overflow-hidden bg-white dark:bg-zinc-900" style={{ minHeight: `${itemSize}px` }}>
                                <div className="flex justify-center items-center p-2 text-center font-bold text-sm sm:text-xl break-words line-clamp-3" style={{ width: `${tierNameWidth}px`, backgroundColor: tier.color, color: getContrastColor(tier.color), touchAction: 'pan-y' }}>
                                      {tier.name}
                                  </div>
                                  <div className="flex-1 flex flex-wrap gap-0 p-0 bg-[#1a1a1a] touch-none">
                                      {results && results[tier.id]?.map((item, index) => {
                                          const placeholderId = `${tier.id}-${item.id}`;
                                          const placedItem = quizUserPlacements[placeholderId];
                                          const isCorrect = quizResults[placeholderId];

                                          return (
                                              <Droppable key={placeholderId} droppableId={placeholderId}>
                                                  {(provided, snapshot) => (
                                                      <div
                                                          ref={provided.innerRef}
                                                          {...provided.droppableProps}
                                                          className={`relative border-2 border-solid border-gray-600 ${snapshot.isDraggingOver ? 'bg-blue-200 border-8 border-solid border-red-500' : ''} touch-none`}
                                                          style={{ width: `${itemSize}px`, height: `${itemSize}px` }}
                                                      >
                                                          <div className="absolute inset-0 flex items-center justify-center bg-white text-gray-400 text-2xl sm:text-4xl">?</div>
                                                          {placedItem && (
                                                              <Draggable key={placedItem.id} draggableId={placedItem.id} index={0} isDragDisabled={isCorrect === true}>
                                                                  {(provided) => (
                                                                      <div
                                                                          ref={provided.innerRef}
                                                                          {...provided.draggableProps}
                                                                          {...provided.dragHandleProps}
                                                                          className="w-full h-full relative group"
                                                                          onClick={() => {
                                                                            if (isTouchDevice && !showLabels) {
                                                                              setTouchedItemId(touchedItemId === placedItem.id ? null : placedItem.id)
                                                                            }
                                                                          }}
                                                                      >
                                                                          {placedItem.is_text_item || !placedItem.image_url ? (
                                                                              <div
                                                                                className="w-full h-full rounded shadow-sm flex items-center justify-center p-2 text-xs text-center"
                                                                                style={{ backgroundColor: placedItem.background_color || '#3b82f6', color: getContrastColor(placedItem.background_color || '#3b82f6') }}
                                                                              >
                                                                                {placedItem.name}
                                                                              </div>
                                                                          ) : (
                                                                              <>
                                                                                  <img src={placedItem.image_url} alt={placedItem.name} className="w-full h-full object-cover"/>
                                                                                  <div className={`absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-0.5 px-1 break-words ${
                                                                                    showLabels
                                                                                      ? ''
                                                                                      : isTouchDevice
                                                                                        ? (touchedItemId === placedItem.id ? '' : 'opacity-0')
                                                                                        : 'opacity-0 group-hover:opacity-100 transition-opacity'
                                                                                  }`}>{placedItem.name}</div>
                                                                              </>
                                                                          )}
                                                                          {isCorrect === true && <div className="absolute inset-0 flex items-center justify-center text-red-500 select-none pointer-events-none z-10"><Circle className="w-12 h-12 sm:w-20 sm:h-20" strokeWidth={4} /></div>}
                                                                          {isCorrect === false && <div className="absolute inset-0 flex items-center justify-center text-red-500 select-none pointer-events-none z-10"><X className="w-16 h-16 sm:w-24 sm:h-24" strokeWidth={4} /></div>}
                                                                      </div>
                                                                  )}
                                                              </Draggable>
                                                          )}
                                                          {provided.placeholder}
                                                      </div>
                                                  )}
                                              </Droppable>
                                          )
                                      })}
                                  </div>
                                </div>
                            ))}
                        </div>
                        <Droppable droppableId="quiz-unranked" direction="horizontal">
                            {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`p-2 border-2 border-solid rounded-md flex flex-wrap gap-2 touch-none`}
                                  style={{ touchAction: 'none', minHeight: quizShuffledItems.length === 0 ? `${itemSize / 2}px` : undefined }}
                                >
                                    {quizShuffledItems.map((item, index) => (
                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className="rounded shadow-sm relative group"
                                                    style={{
                                                      ...provided.draggableProps.style,
                                                      width: `${itemSize}px`,
                                                      height: `${itemSize}px`
                                                    }}
                                                    onClick={() => {
                                                      if (isTouchDevice && !showLabels) {
                                                        setTouchedItemId(touchedItemId === item.id ? null : item.id)
                                                      }
                                                    }}
                                                >
                                                    {item.is_text_item || !item.image_url ? (
                                                        <div
                                                          className="w-full h-full rounded shadow-sm flex items-center justify-center p-2 text-xs text-center"
                                                          style={{ backgroundColor: item.background_color || '#3b82f6', color: getContrastColor(item.background_color || '#3b82f6') }}
                                                        >
                                                          {item.name}
                                                        </div>
                                                    ) : (
                                                      <>
                                                          <img src={item.image_url} alt={item.name} className="w-full h-full"/>
                                                          <div className={`absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-0.5 px-1 break-words ${
                                                            showLabels
                                                              ? ''
                                                              : isTouchDevice
                                                                ? (touchedItemId === item.id ? '' : 'opacity-0')
                                                                : 'opacity-0 group-hover:opacity-100 transition-opacity'
                                                          }`}>{item.name}</div>
                                                      </>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                    </div>
                     <div className="mt-0 flex justify-center gap-4">
                        <button
                          onClick={handleCheckAnswer}
                          disabled={!hasUngradedPlacedItems}
                          className="px-10 py-4 rounded-lg font-bold text-lg shadow-lg text-white transition-all bg-indigo-600 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                          title={!hasUngradedPlacedItems ? "解答するアイテムを配置してください" : undefined}
                        >
                          解答
                        </button>
                        <button onClick={() => { setIsResultMode(true); setActiveTab('result'); setEvaluationMode('absolute'); window.scrollTo(0, 0); }} className="px-10 py-4 rounded-lg font-bold text-lg shadow-lg text-white transition-all bg-gray-600 hover:scale-105">答えを見る</button>
                    </div>
                    <TierListMetadata tierList={tierList} />
                  <ActionButtons {...{ currentUser, tierList, isScreenshotLoading, handleShare, setIsReportModalOpen, isBanned, handleSaveAsImage, setShowLabels, showLabels, activeTab }} />
                </div>
              </DragDropContext>
              <PageScrollbar />
              </>
            ) : (
              <div className="space-y-1 sm:p-1">
                {/* 説明文 + トグルボタン */}
                <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-muted-foreground">
                  <p className="text-left text-sm text-muted-foreground">
                    アイテムを{isTouchDevice ? 'ダブルタップ' : 'ダブルクリック'}するとアイテムの詳細ページに遷移します。
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="my-1 inline-flex rounded-md shadow-sm" role="group">
                      <button
                        type="button"
                        onClick={() => setEvaluationMode('absolute')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-l-md transition-colors ${evaluationMode === 'absolute'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600'}`}
                      >
                        絶対評価
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvaluationMode('relative')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-r-md transition-colors ${evaluationMode === 'relative'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600'}`}
                      >
                        相対評価
                      </button>
                    </div>
                  </div>
                </div>

                {/* Item Size Slider */}
                <div className="flex items-center gap-3 px-4 py-1 my-0">
                  <button 
                    onClick={() => setShowLabels(!showLabels)}
                    className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-md hover:bg-accent transition-colors whitespace-nowrap w-[90px] shrink-0 flex justify-center"
                  >
                    {showLabels ? '名前を非表示' : '名前を表示'}
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.01"
                    value={itemScale}
                    onChange={(e) => handleItemScaleChange(parseFloat(e.target.value))}
                    style={{
                      background: getSliderBackground(itemScale)
                    }}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:border-0"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                    {Math.round(itemScale * 100)}%
                  </span>
                </div>

                {loadingResults ? (
                  <div className="text-center py-20 text-muted-foreground">集計中...</div>
                ) : (
                  <div id="tier-list-content">
                  <div className="flex flex-col">
                    {tiers.map((tier) => (
                      <div key={tier.id} className="flex border-b border-x first:border-t overflow-hidden bg-white dark:bg-zinc-900" style={{ minHeight: `${itemSize}px` }}>
                        <div className="flex flex-col justify-center items-center p-2 text-center font-bold text-sm sm:text-xl break-words line-clamp-3" style={{ width: `${tierNameWidth}px`, backgroundColor: tier.color, color: getContrastColor(tier.color) }}>
                          {tier.name}
                          {selectedItemId && itemVoteDist && (
                            <div className="text-xs mt-1">
                              {itemVoteDist[selectedItemId]?.[tier.id] || 0}票 ({voteStats?.[selectedItemId]?.count ?? 0 > 0 ? Math.round(((itemVoteDist[selectedItemId]?.[tier.id] || 0) / voteStats![selectedItemId]!.count) * 100) : 0}%)
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-wrap gap-0 p-0 bg-[#1a1a1a]">
                          {results?.[tier.id]?.map((item) => (
                            <div
                              key={item.id}
                              className="relative group cursor-pointer"
                              style={{ width: `${itemSize}px`, height: `${itemSize}px` }}
                              onMouseEnter={!isTouchDevice ? () => setSelectedItemId(item.id) : undefined}
                              onMouseLeave={!isTouchDevice ? () => setSelectedItemId(null) : undefined}
                              onClick={() => {
                                if (isTouchDevice) {
                                  const now = Date.now()
                                  const DOUBLE_TAP_DELAY = 300

                                  if (lastTapItemId === item.id && now - lastTapTime < DOUBLE_TAP_DELAY) {
                                    // ダブルタップ
                                    handleItemDoubleClick(item)
                                    setLastTapTime(0)
                                    setLastTapItemId(null)
                                  } else {
                                    // シングルタップ
                                    setSelectedItemId(selectedItemId === item.id ? null : item.id)
                                    if (!showLabels) {
                                      setTouchedItemId(touchedItemId === item.id ? null : item.id)
                                    }
                                    setLastTapTime(now)
                                    setLastTapItemId(item.id)
                                  }
                                } else {
                                  setSelectedItemId(selectedItemId === item.id ? null : item.id)
                                }
                              }}
                              onDoubleClick={() => !isTouchDevice && handleItemDoubleClick(item)}
                            >
                              {item.is_text_item ? (
                                <div
                                  className="w-full h-full rounded shadow-sm flex items-center justify-center p-2 text-xs text-center"
                                  style={{ backgroundColor: item.background_color || '#3b82f6', color: getContrastColor(item.background_color || '#3b82f6') }}
                                >
                                  {item.name}
                                </div>
                              ) : (
                                <>
                                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded shadow-sm"/>
                                  <div className={`absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-0.5 px-1 break-words ${
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
                        まだ投票がありません。最初の投票者になりましょう！
                      </div>
                    )}
                  </div>
                  </div>
                )}
                <TierListMetadata tierList={tierList} />
                  <ActionButtons {...{ currentUser, tierList, isScreenshotLoading, handleShare, setIsReportModalOpen, isBanned, handleSaveAsImage, setShowLabels, showLabels, activeTab }} />
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab !== 'edit' && (
        <div className="mt-4 border-t pt-2">
          {displayedRelatedLists.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold">関連ティアリスト</h2>
                <RandomAffiliateLink index={100} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {displayedRelatedLists.map((item: any, index: number) => {
                  const cardClass = "group flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all relative h-full w-full aspect-video";
                  let href = "";
                  let src = "";

                  if (item.isAmazonBookAd) {
                      href = "https://amzn.to/3YHTkdu";
                      src = "/images/Amazon/Amazon_book.png";
                  } else if (item.isAmazonFurusatoAd) {
                      href = "https://amzn.to/4qnIOEo";
                      src = "/images/Amazon/Amazon_furusato.png";
                  } else if (item.isAmazonRankingAd) {
                      href = "https://amzn.to/45hogFa";
                      src = "/images/Amazon/Amazon_ranking.png";
                  } else if (item.isAmazonTimesaleAd) {
                      href = "https://amzn.to/3Y7mhiZ";
                      src = "/images/Amazon/Amazon_timesale.png";
                  }

                  if (href) {
                      return (
                        <a key={`related-ad-${index}`} href={href} target="_blank" rel="nofollow sponsored noopener" className={cardClass}>
                          <img src={src} alt="Amazon" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
                            PR
                          </div>
                        </a>
                      )
                  }

                  const userHasVoted = userVotedTierListIds.includes(item.id);
                  return <TierListCard key={item.id} list={item} isAdmin={isAdmin} currentUserId={currentUser?.id} userHasVoted={userHasVoted} />
                })}
              </div>
            </div>
          )}

          {displayedRelatedItems.length > 0 && (
            <div className="mb-12 border-t pt-8">
              <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold">関連アイテム</h2>
                <RandomAffiliateLink index={200} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayedRelatedItems.map((item: any, index: number) => {
                  // Handle Amazon ads
                  if (item.isAmazonBookAd) {
                      return (
                        <a key={`ad-book-${index}`} href="https://amzn.to/3YHTkdu" target="_blank" rel="nofollow sponsored noopener" className="group block">
                            <div className="aspect-square bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative shadow-sm hover:shadow-md transition">
                                <img src="/images/Amazon/Amazon_book.png" alt="Amazon Book" className="w-full h-full object-cover" />
                            </div>
                        </a>
                      )
                  }
                  if (item.isAmazonFurusatoAd) {
                      return (
                        <a key={`ad-furusato-${index}`} href="https://amzn.to/4qnIOEo" target="_blank" rel="nofollow sponsored noopener" className="group block">
                            <div className="aspect-square bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative shadow-sm hover:shadow-md transition">
                                <img src="/images/Amazon/Amazon_furusato.png" alt="Amazon Furusato" className="w-full h-full object-cover" />
                            </div>
                        </a>
                      )
                  }
                  if (item.isAmazonRankingAd) {
                      return (
                        <a key={`ad-ranking-${index}`} href="https://amzn.to/45hogFa" target="_blank" rel="nofollow sponsored noopener" className="group block">
                            <div className="aspect-square bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative shadow-sm hover:shadow-md transition">
                                <img src="/images/Amazon/Amazon_ranking.png" alt="Amazon Ranking" className="w-full h-full object-cover" />
                            </div>
                        </a>
                      )
                  }
                  if (item.isAmazonTimesaleAd) {
                      return (
                        <a key={`ad-timesale-${index}`} href="https://amzn.to/3Y7mhiZ" target="_blank" rel="nofollow sponsored noopener" className="group block">
                            <div className="aspect-square bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative shadow-sm hover:shadow-md transition">
                                <img src="/images/Amazon/Amazon_timesale.png" alt="Amazon Timesale" className="w-full h-full object-cover" />
                            </div>
                        </a>
                      )
                  }

                  // Regular items
                  const imageUrl = item.item_is_text_item ? null : item.item_image_url
                  return (
                    <Link
                      key={item.item_name}
                      href={`/items/${encodeURIComponent(item.item_name)}`}
                      className="group"
                    >
                      <div className="aspect-square bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative shadow-sm hover:shadow-md transition">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.item_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-white dark:bg-zinc-700 text-gray-400">
                            {item.item_name[0]}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                      <div className="mt-2 text-sm font-medium text-center truncate px-1 group-hover:text-indigo-600 transition-colors">
                        {item.item_name}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          <CommentSection
            initialComments={initialComments}
            currentUserId={currentUser?.id}
            tierListId={tierList.id}
            tierListOwnerId={tierList.user_id}
            isAdmin={isAdmin}
          />
        </div>
      )}

      <TierListReportModal 
        tierListId={tierList.id} 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
      />
    </div>
  )
}