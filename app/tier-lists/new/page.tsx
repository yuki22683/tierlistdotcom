'use client'

import { useTierListStore, TierItem, Tier } from '@/store/tierListStore'
import { createClient } from '@/utils/supabase/client'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, Trash2, GripVertical, X, Image, Type, Pipette, ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useRef, Suspense, useEffect } from 'react'
import { getContrastColor } from '@/utils/colors'
import { resizeImageToSquare } from '@/utils/image'
import { deleteImageIfUnused } from '@/utils/imageCleanup'
import TagInput from '@/components/TagInput'
import AutocompleteInput from '@/components/AutocompleteInput'
import ImageCropper from '@/components/ImageCropper'
import { useLoading } from '@/context/LoadingContext'
import RakutenLeftWidget from '@/components/RakutenLeftWidget'
import RakutenRightWidget from '@/components/RakutenRightWidget'

function CreateTierListContent() {
  const router = useRouter()
  const pathname = usePathname()
  // Removed categoryId dependency
  const supabase = createClient()
  const { startLoading } = useLoading()

  const {
    title, description, tiers, unrankedItems, tags, allowVoting,
    setTitle, setDescription, addTier, updateTier, deleteTier,
    addUnrankedItem, addUnrankedTextItem, removeUnrankedItem, updateItemName, updateItemColor, moveItem,
    reset,
    initialize,
    setAllowVoting,
    deleteItem // New
  } = useTierListStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBanned, setIsBanned] = useState(false)
  const [user, setUser] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [croppingFiles, setCroppingFiles] = useState<File[]>([])
  const [currentCroppingIndex, setCurrentCroppingIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(0)

  const searchParams = useSearchParams()
  const forkFrom = searchParams.get('forkFrom')

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
  }, [tiers, unrankedItems])

  useEffect(() => {
    if (!forkFrom) return

    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID()
        }
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }

    const loadForkData = async () => {
      try {
        // 1. Fetch Tier List Details
        const { data: tierList } = await supabase
            .from('tier_lists')
            .select('*')
            .eq('id', forkFrom)
            .single()
        
        if (!tierList) return

        // 2. Fetch Tiers
        const { data: tiersData } = await supabase
            .from('tiers')
            .select('*')
            .eq('tier_list_id', forkFrom)
            .order('order')
        
        if (!tiersData) return

        // 3. Fetch Items
        const { data: itemsData } = await supabase
            .from('items')
            .select('*')
            .eq('tier_list_id', forkFrom)
        
        if (!itemsData) return

        // 4. Fetch Votes for Calculation
        const { data: voteIds } = await supabase.from('votes').select('id').eq('tier_list_id', forkFrom)
        
        let itemScores: Record<string, { total: number, count: number }> = {}
        
        if (voteIds && voteIds.length > 0) {
            const ids = voteIds.map(v => v.id)
            const { data: voteItems } = await supabase.from('vote_items').select('item_id, tier_id').in('vote_id', ids)
            
            if (voteItems) {
            const tierScoreMap: Record<string, number> = {}
            const numTiers = tiersData.length
            const medianIndex = (numTiers - 1) / 2
            
            tiersData.forEach((t, idx) => {
                tierScoreMap[t.id] = medianIndex - idx
            })

            voteItems.forEach((vi: any) => {
                if (!itemScores[vi.item_id]) itemScores[vi.item_id] = { total: 0, count: 0 }
                const score = tierScoreMap[vi.tier_id] || 0
                itemScores[vi.item_id].total += score
                itemScores[vi.item_id].count += 1
            })
            }
        }

        // 5. Fetch Tags
        const { data: tagData } = await supabase
            .from('tier_list_tags')
            .select('tags(name)')
            .eq('tier_list_id', forkFrom)
        
        const loadedTags = tagData?.map((t: any) => t.tags?.name).filter(Boolean) || []

        // 6. Construct Store State
        // Create base tier structure
        const storeTiers: Tier[] = tiersData.map(t => ({
            id: t.id, 
            name: t.name,
            color: t.color,
            items: []
        }))
        
        const storeUnranked: TierItem[] = []
        const medianIndex = (tiersData.length - 1) / 2

        // Prepare items with score for sorting
        const itemsWithScore = itemsData.map(item => {
            const stats = itemScores[item.id]
            const score = stats ? (stats.total / stats.count) : -9999
            return { item, score, hasVotes: !!stats }
        })

        // Sort items by score descending (high score first)
        itemsWithScore.sort((a, b) => b.score - a.score)

        itemsWithScore.forEach(({ item, score, hasVotes }) => {
            const newItem: TierItem = {
                id: generateId(), 
                name: item.name,
                imageUrl: item.image_url,
                backgroundColor: item.background_color,
                isTextItem: item.is_text_item
            }

            if (hasVotes) {
                let tierIdx = Math.round(medianIndex - score)
                tierIdx = Math.max(0, Math.min(tiersData.length - 1, tierIdx))
                
                // Find the tier by index (tiersData is ordered by 'order', so index matches)
                const targetTier = storeTiers[tierIdx]
                if (targetTier) {
                    targetTier.items.push(newItem)
                } else {
                    storeUnranked.push(newItem)
                }
            } else {
                // No votes -> Unranked (Available to place)
                storeUnranked.push(newItem)
            }
        })
        
        // Generate NEW IDs for tiers for the UI state
        const finalTiers = storeTiers.map(t => ({
            ...t,
            id: `tier-${Math.random().toString(36).substr(2, 9)}` 
        }))

        initialize({
            title: tierList.title, 
            description: tierList.description || '',
            tiers: finalTiers,
            unrankedItems: storeUnranked,
            tags: loadedTags,
            allowVoting: true // Reset to true for new fork
        })
      } catch (error) {
        console.error("Error loading fork data:", error)
      }
    }

    loadForkData()
  }, [forkFrom, supabase, reset, initialize])

  // --- Draft Logic ---
  useEffect(() => {
      const loadDraft = async () => {
          if (forkFrom) return; // Don't load draft if forking
          
          // Always reset first to ensure clean state
          reset();

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const draftKey = `tierListDraft_${user.id}`;
          const draft = localStorage.getItem(draftKey);

          if (draft) {
              try {
                  const parsedDraft = JSON.parse(draft);
                  // Check if draft is older than 24 hours (optional, but good practice)
                  // For now, just load it.
                  
                  // Restore state
                  // Note: initialize expects a specific structure. The draft should match it.
                  initialize({
                      title: parsedDraft.title,
                      description: parsedDraft.description,
                      tiers: parsedDraft.tiers,
                      unrankedItems: parsedDraft.unrankedItems,
                      tags: parsedDraft.tags,
                      allowVoting: parsedDraft.allowVoting
                  });
              } catch (e) {
                  console.error("Failed to parse draft", e);
              }
          }
      };
      loadDraft();
  }, [forkFrom, supabase, initialize, reset]);

  const handleSaveDraft = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          alert("ログインが必要です");
          return;
      }

      const draftData = {
          title,
          description,
          tiers,
          unrankedItems,
          tags,
          allowVoting,
          updatedAt: Date.now()
      };

      try {
          localStorage.setItem(`tierListDraft_${user.id}`, JSON.stringify(draftData));
          alert("一時保存しました。\n次回「+ティアリストを作成」をクリックした際に復元されます。");
      } catch (e) {
          console.error("Failed to save draft", e);
          alert("一時保存に失敗しました。");
      }
  };

  useEffect(() => {
    checkBanStatus()
  }, [])

  const checkBanStatus = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    setUser(authUser)

    const { data } = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', authUser.id)
      .single()

    if (data?.is_banned) {
      setIsBanned(true)
    }
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
      // For new tier lists, we don't have a tier list ID yet, so we check all tier lists
      await deleteImageIfUnused(item.imageUrl)
    }

    // Delete item from state
    deleteItem(itemId)
  }

  // Validation Logic
  const hasUnrankedItems = unrankedItems.length > 0;
  const hasNoTieredItems = tiers.every(tier => tier.items.length === 0);
  const canPublish = !isBanned && !hasUnrankedItems && !hasNoTieredItems && title.trim().length > 0;
  
  // Ref to track current path for popstate restoration
  const pathnameRef = useRef(pathname)
  useEffect(() => {
      pathnameRef.current = pathname
  }, [pathname])

  // -- Navigation Warning --
  // Check if form is dirty
  const isDirty = title.length > 0 || unrankedItems.length > 0 || tiers.some(t => t.items.length > 0);

  useEffect(() => {
      // 1. Native Browser Navigation (Refresh, Close Tab, Hard Back)
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (!isDirty || isSubmitting) return;
          e.preventDefault();
          e.returnValue = '';
      };
      
      // 2. Click Handler (Capture) - For Internal Links and Logout Button
      const handleCaptureClick = (e: MouseEvent) => {
          if (!isDirty || isSubmitting) return;
          const target = e.target as HTMLElement;
          
          const anchor = target.closest('a');
          const button = target.closest('button');
          
          // Detect Logout Button by text content (simple heuristic)
          const isLogout = button && button.innerText.trim() === 'ログアウト';
          
          // Detect Internal Links
          const isLink = anchor && anchor.href && !anchor.target && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && !anchor.href.startsWith('mailto:') && !anchor.hasAttribute('download');

          if (isLink || isLogout) {
             if (!window.confirm("編集中の内容は破棄されます。本当に移動しますか？")) {
                 e.preventDefault();
                 e.stopPropagation();
             } else {
                 reset();
             }
          }
      };

      // 3. Submit Handler (Capture) - For Search Form
      const handleCaptureSubmit = (e: Event) => {
          if (!isDirty || isSubmitting) return;
          if (!window.confirm("編集中の内容は破棄されます。本当に移動しますか？")) {
              e.preventDefault();
              e.stopPropagation();
          } else {
              reset();
          }
      };

      // 4. Popstate Handler - For Browser Back Button
      const handlePopState = (e: PopStateEvent) => {
          if (!isDirty || isSubmitting) return;
          
          if (!window.confirm("編集中の内容は破棄されます。本当に移動しますか？")) {
              // User wants to stay. Restore URL.
              window.history.pushState(null, '', pathnameRef.current);
          } else {
              reset();
          }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('click', handleCaptureClick, true); // Capture phase
      window.addEventListener('submit', handleCaptureSubmit, true); // Capture phase
      window.addEventListener('popstate', handlePopState);

      return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          window.removeEventListener('click', handleCaptureClick, true);
          window.removeEventListener('submit', handleCaptureSubmit, true);
          window.removeEventListener('popstate', handlePopState);
      };
  }, [isDirty, isSubmitting, reset]);


  // -- Handlers --

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    moveItem(source, destination)
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
      // Use correct extension based on blob type
      const fileExt = croppedBlob.type.split('/')[1]
      const fileName = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload
      const { error: uploadError } = await supabase.storage
        .from('category_images')
        .upload(fileName, croppedBlob, {
          contentType: croppedBlob.type
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('category_images')
        .getPublicUrl(fileName)

      const newItem: TierItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        imageUrl: publicUrl,
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

  const handleStartOver = () => {
      if (window.confirm("編集中の内容は破棄されます。本当に作り直しますか？")) {
          reset();
      }
  }

  const handleSave = async () => {
    if (!title) {
        alert("タイトルを入力してください")
        return
    }
    
    setIsSubmitting(true)
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("認証されていません")

        // Check daily limit (20)
        const today = new Date().toISOString().split('T')[0]
        const { count } = await supabase
            .from('tier_lists')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', today)
        
        if ((count || 0) >= 20) {
            alert("1日の作成上限は20件です。")
            setIsSubmitting(false)
            return
        }

        // 1. Create Tier List
        const { data: tierList, error: listError } = await supabase
            .from('tier_lists')
            .insert({
                user_id: user.id,
                // category_id removed
                title,
                description,
                allow_voting: allowVoting,
                vote_count: 1
            })
            .select()
            .single()

        if (listError) throw listError

        // --- TAGS SAVING LOGIC START ---
        if (tags.length > 0) {
            const tagPromises = tags.map(async (tagName) => {
                // 1. Get or Create Tag ID via RPC
                const { data: tagId, error: tagError } = await supabase
                    .rpc('get_or_create_tag', { tag_name: tagName })
                
                if (tagError) throw tagError
                
                // 2. Insert Relation
                return {
                    tier_list_id: tierList.id,
                    tag_id: tagId
                }
            })

            const relations = await Promise.all(tagPromises)
            
            const { error: relError } = await supabase
                .from('tier_list_tags')
                .insert(relations)
            
            if (relError) throw relError
        }
        // --- TAGS SAVING LOGIC END ---

        // 2. Create Tiers
        const tiersToInsert = tiers.map((t, index) => ({
            tier_list_id: tierList.id,
            name: t.name,
            color: t.color,
            order: index
        }))

        const { data: createdTiers, error: tiersError } = await supabase
            .from('tiers')
            .insert(tiersToInsert)
            .select()
        
        if (tiersError) throw tiersError

        // 3. Create Vote (Creator's Vote)
        const { data: newVote, error: voteError } = await supabase
            .from('votes')
            .insert({
                tier_list_id: tierList.id,
                user_id: user.id
            })
            .select()
            .single()

        if (voteError) throw voteError

        // 4. Create Items & Vote Items
        let allItemsPayload = []
        let voteItemsPayload = []

        // Process Ranked Items
        for (const t of tiers) {
             const dbTier = createdTiers.find(ct => ct.order === tiers.indexOf(t)) // Match by index/order
             if (!dbTier) continue

             for (const item of t.items) {
                 const itemId = crypto.randomUUID()
                 allItemsPayload.push({
                     id: itemId,
                     tier_list_id: tierList.id,
                     name: item.name,
                     image_url: item.imageUrl,
                     background_color: item.backgroundColor,
                     is_text_item: item.isTextItem
                 })
                 
                 voteItemsPayload.push({
                     vote_id: newVote.id,
                     item_id: itemId,
                     tier_id: dbTier.id
                 })
             }
        }

        // Process Unranked Items
        for (const item of unrankedItems) {
            const itemId = crypto.randomUUID()
            allItemsPayload.push({
                id: itemId,
                tier_list_id: tierList.id,
                name: item.name,
                image_url: item.imageUrl,
                background_color: item.backgroundColor,
                is_text_item: item.isTextItem
            })
        }

        if (allItemsPayload.length > 0) {
            const { error: itemsError } = await supabase
                .from('items')
                .insert(allItemsPayload)
            
            if (itemsError) throw itemsError
        }

        if (voteItemsPayload.length > 0) {
            const { error: voteItemsError } = await supabase
                .from('vote_items')
                .insert(voteItemsPayload)
            
            if (voteItemsError) throw voteItemsError
        }

        // Clear Draft
        localStorage.removeItem(`tierListDraft_${user.id}`);

        // Success!
        reset(); 
        router.push(`/tier-lists/${tierList.id}`) // Go to vote/view page
        router.refresh()

    } catch (err: any) {
        console.error("Save error:", err)
        alert("ティアリストの保存に失敗しました: " + err.message)
    } finally {
        setIsSubmitting(false)
    }
  }

  // -- Render --

  // Removed categoryId check

  return (
    <div ref={containerRef} className="container mx-auto py-8 px-4 max-w-5xl relative">
      <RakutenLeftWidget containerHeight={containerHeight} uniqueKey="tier-list-new" />
      <RakutenRightWidget containerHeight={containerHeight} uniqueKey="tier-list-new" />
      <div className="relative">
        <button
            onClick={() => { startLoading(); router.back(); }}
            className="fixed top-1/2 -translate-y-1/2 left-4 z-40 p-2 rounded-lg shadow-lg text-white transition-all bg-gray-600 hover:scale-105 hover:bg-gray-700 flex items-center justify-center"
            aria-label="戻る"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold">新規ティアリスト作成</h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                    onClick={handleStartOver}
                    className="px-10 py-4 rounded-lg font-bold text-lg text-red-600 border border-red-200 hover:bg-red-50 transition-all hover:scale-105 shadow-lg w-full sm:w-auto"
                >
                    最初から作り直す
                </button>
            </div>
          </div>
      {/* Metadata Form */}
      <div className="bg-card border rounded-xl p-6 mb-8 space-y-4">
        <div>
            <label className="block text-sm font-medium mb-1">タイトル(必須)</label>
            <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="タイトルを入力してください。 例: 最強の少年アニメキャラ"
                className="w-full p-2 border rounded-md bg-background focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-red-400"
            />
        </div>
        <div>
            <label className="block text-sm font-medium mb-1">説明 (任意)</label>
            <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="ティアリストの説明や各階層の基準などを入力してください。"
                className="w-full p-2 border rounded-md bg-background h-24 focus:ring-1 focus:ring-indigo-500 outline-none"
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
        
        {/* Unranked Items Area */}
        <div className="bg-card border rounded-xl p-6 mb-12">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h3 className="font-bold text-lg">アイテムを追加</h3>
                    {hasNoTieredItems && unrankedItems.length === 0 && (
                        <span className="text-red-500 text-xs font-bold">
                            アイテムをティアリストに配置してください。
                        </span>
                    )}
                    {hasUnrankedItems && (
                        <span className="text-red-500 text-xs font-bold">
                            アイテムをティアリストに追加してください。
                        </span>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                        onClick={addUnrankedTextItem}
                        disabled={isBanned || unrankedItems.length + tiers.reduce((sum, t) => sum + t.items.length, 0) >= 100}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                        <Type size={16} /> テキストを追加
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBanned || unrankedItems.length + tiers.reduce((sum, t) => sum + t.items.length, 0) >= 100}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                        <Image size={16} /> 画像を追加
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                    />
                </div>
            </div>
            {unrankedItems.length + tiers.reduce((sum, t) => sum + t.items.length, 0) >= 100 && (
                <div className="text-sm text-red-600 mb-2">アイテム数は100が上限です。</div>
            )}

            <Droppable droppableId="unranked" direction="horizontal">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[120px] p-4 border-2 border-dashed rounded-md flex flex-wrap gap-4 transition-colors touch-none ${snapshot.isDraggingOver ? 'bg-accent/30 border-blue-100' : 'border-border'}`}
                    >
                        {unrankedItems.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="relative w-[68px] h-[68px] sm:w-[102px] sm:h-[102px] group bg-background rounded-md shadow-sm border overflow-hidden"
                                    >
                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="absolute top-0 right-0 p-1 bg-red-100 text-red-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-bl-md z-10"
                                        >
                                            <X size={12} />
                                        </button>

                                        {item.isTextItem ? (
                                            <div 
                                                className="w-full h-full flex items-center justify-center p-2 relative"
                                                style={{ backgroundColor: item.backgroundColor || '#3b82f6' }}
                                            >
                                                <AutocompleteInput
                                                    type="text"
                                                    value={item.name}
                                                    onValueChange={(val) => updateItemName(item.id, val)}
                                                    className={`w-full bg-transparent text-sm text-center outline-none ${getContrastColor(item.backgroundColor || '#3b82f6') === 'white' ? 'placeholder-white/70' : 'placeholder-black/50'}`}
                                                    style={{ color: getContrastColor(item.backgroundColor || '#3b82f6') }}
                                                    placeholder="名無し"
                                                />
                                                <div className="absolute top-1 left-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20 cursor-pointer">
                                                    <Pipette size={14} className="drop-shadow-md" style={{ color: getContrastColor(item.backgroundColor || '#3b82f6') }} />
                                                    <input 
                                                        type="color" 
                                                        value={item.backgroundColor || '#3b82f6'}
                                                        onChange={(e) => updateItemColor(item.id, e.target.value)}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <img 
                                                    src={item.imageUrl} 
                                                    alt={item.name} 
                                                    className="w-full h-full object-cover"
                                                />
                                                <AutocompleteInput
                                                    value={item.name}
                                                    onValueChange={(val) => updateItemName(item.id, val)}
                                                    className="absolute bottom-0 left-0 right-0 text-xs bg-black/70 text-white border-none text-center py-1 px-1 outline-none focus:bg-black/90 break-words line-clamp-3"
                                                    placeholder="名無し"
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        {unrankedItems.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm italic">
                                アイテムを追加してください。<br />
                                違法な画像の投稿は警察に通報します。
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>

        {/* Tiers Area */}
        <div className="flex flex-col mb-12">
            <div className="mb-4 text-sm text-muted-foreground font-medium">
                ここで作成したティアリストが最初の1票になります。
            </div>
            {tiers.map((tier, index) => (
                <div key={tier.id} className="flex min-h-[68px] sm:min-h-[102px] border-x border-b first:border-t first:rounded-t-md last:rounded-b-md overflow-hidden bg-black">
                    {/* Tier Label (Left) */}
                    <div
                        className="w-16 sm:w-32 flex flex-col justify-center items-center p-2 relative group"
                        style={{ backgroundColor: tier.color }}
                    >
                        <input
                            type="text"
                            value={tier.name}
                            onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                            className="text-center font-bold text-xl bg-transparent border-none outline-none w-full"
                            style={{ color: getContrastColor(tier.color) }}
                            placeholder="名前"
                        />
                        {/* Color Picker - Left Top */}
                        <div className="absolute top-1 left-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <div className="relative p-1 bg-white/50 rounded hover:bg-white/80 cursor-pointer flex items-center justify-center w-5 h-5">
                                <Pipette size={12} className="text-black/70" />
                                <input
                                    type="color"
                                    value={tier.color}
                                    onChange={(e) => updateTier(tier.id, { color: e.target.value })}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                        {/* Delete Button - Right Top */}
                        <div className="absolute top-1 right-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { if (confirm('この階層を削除してもよろしいですか？')) deleteTier(tier.id) }} className="p-1 bg-white/50 rounded hover:bg-white/80"><Trash2 size={12}/></button>
                        </div>
                    </div>

                    {/* Droppable Area (Right) */}
                    <Droppable droppableId={tier.id} direction="horizontal">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`flex-1 flex flex-wrap gap-0 p-0 transition-colors touch-none ${snapshot.isDraggingOver ? 'bg-accent/50' : ''}`}
                            >
                                {tier.items.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="relative w-[68px] h-[68px] sm:w-[102px] sm:h-[102px] group"
                                            >
                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="absolute top-0 right-0 p-1 bg-red-100 text-red-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-bl-md z-10"
                                                >
                                                    <X size={12} />
                                                </button>
                                                {item.isTextItem ? (
                                                    <div 
                                                        className="w-full h-full rounded shadow-sm flex items-center justify-center p-1 relative"
                                                        style={{ backgroundColor: item.backgroundColor || '#3b82f6' }}
                                                    >
                                                        <AutocompleteInput
                                                            type="text"
                                                            value={item.name}
                                                            onValueChange={(val) => updateItemName(item.id, val)}
                                                            className={`w-full bg-transparent text-xs text-center outline-none ${getContrastColor(item.backgroundColor || '#3b82f6') === 'white' ? 'placeholder-white/70' : 'placeholder-black/50'}`}
                                                            style={{ color: getContrastColor(item.backgroundColor || '#3b82f6') }}
                                                            placeholder="名無し"
                                                        />
                                                        <div className="absolute top-1 left-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20 cursor-pointer">
                                                            <Pipette size={14} className="drop-shadow-md" style={{ color: getContrastColor(item.backgroundColor || '#3b82f6') }} />
                                                            <input 
                                                                type="color" 
                                                                value={item.backgroundColor || '#3b82f6'}
                                                                onChange={(e) => updateItemColor(item.id, e.target.value)}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <img 
                                                            src={item.imageUrl} 
                                                            alt={item.name} 
                                                            className="w-full h-full object-cover rounded shadow-sm"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <GripVertical className="text-white" />
                                                        </div>
                                                        <AutocompleteInput
                                                            value={item.name}
                                                            onValueChange={(val) => updateItemName(item.id, val)}
                                                            onClick={(e: React.MouseEvent) => e.stopPropagation()} // Prevent drag start on input click
                                                            className="absolute bottom-0 left-0 right-0 text-xs bg-black/70 text-white border-none text-center py-0.5 outline-none focus:bg-black/90 break-words line-clamp-3"
                                                            placeholder="名無し"
                                                        />
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

            <button
                onClick={addTier}
                disabled={isBanned || tiers.length >= 20}
                className="w-full mt-4 py-3 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Plus size={20} className="mr-2" /> 階層を追加
            </button>
            {tiers.length >= 20 && (
                <div className="text-sm text-red-600 mt-2">階層数は20が上限です。</div>
            )}
        </div>

      </DragDropContext>

      <div className="sticky bottom-4 mt-8 flex justify-center gap-4">
          <button
              onClick={handleSaveDraft}
              disabled={!user}
              className="px-10 py-4 rounded-lg font-bold text-lg shadow-lg bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
              一時保存
          </button>
          <button 
              onClick={handleSave}
              disabled={isSubmitting || !canPublish || !user}
              className="px-10 py-4 rounded-lg font-bold text-lg shadow-lg text-white transition-all bg-indigo-600 hover:scale-105 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[140px]"
          >
              {isSubmitting ? (
                  '更新中...'
              ) : !user ? (
                  <div className="flex flex-col items-center leading-tight">
                      <span>公開</span>
                      <span className="text-xs font-normal opacity-90 mt-0.5">ログインが必要です</span>
                  </div>
              ) : (
                  '公開'
              )}
          </button>
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
    </div>
  )
}

export default function CreateTierListPage() {
    return (
        <Suspense fallback={<div className="p-8">読み込み中...</div>}>
            <CreateTierListContent />
        </Suspense>
    )
}