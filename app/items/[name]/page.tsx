import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BackButton from '@/components/BackButton'
import CommentSection from '@/components/comments/CommentSection'
import { getContrastColor } from '@/utils/colors'
import HomeWrapper from '@/components/HomeWrapper'
import ImageSlideshow from '@/components/ImageSlideshow'
import SaveItemToHistory from '@/components/SaveItemToHistory'
import RandomAffiliateLink from '@/components/RandomAffiliateLink'
import Image from 'next/image'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ name: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  const itemName = decodeURIComponent(name)
  const supabase = await createClient()

  // Fetch some info to make description better
  const { data: occurrences } = await supabase
    .from('items')
    .select('tier_list_id')
    .eq('name', itemName)

  const count = occurrences?.length || 0
  const description = count > 0 
    ? `${itemName}の評価・ランキング。計${count}件のティアリストに登場し、ユーザーによる絶対評価・相対評価の平均スコアを確認できます。`
    : `${itemName}の評価・ランキング。みんなのティアリストでの順位やコメントを確認できます。`
  
  return {
    title: `${itemName}の評価・ランキング | ティアリスト.com`,
    description: description,
    openGraph: {
      title: `${itemName}の評価・ランキング | ティアリスト.com`,
      description: description,
      images: ["/logo.png"],
    },
    twitter: {
      card: "summary",
      title: `${itemName}の評価・ランキング | ティアリスト.com`,
      description: description,
      images: ["/logo.png"],
    },
  }
}

type Tier = {
  id: string
  name: string
  color: string
  order: number
  tier_list_id: string
}

type VoteItem = {
  item_id: string
  tier_id: string
  votes: {
    tier_list_id: string
  }
}

// Helper to calculate ranks
const calculateRanks = (
  targetItemId: string,
  tierListId: string,
  tiers: Tier[],
  voteItems: VoteItem[],
  allItemsInList: any[]
) => {
  // Filter data for this tier list
  const listTiers = tiers.filter(t => t.tier_list_id === tierListId).sort((a, b) => a.order - b.order)
  const listVotes = voteItems.filter(v => v.votes.tier_list_id === tierListId)
  
  // If no votes, return unranked or default
  if (listVotes.length === 0) return { absolute: null, relative: null }

  const numTiers = listTiers.length
  const medianIndex = (numTiers - 1) / 2
  const tierScoreMap: Record<string, number> = {}
  
  listTiers.forEach((t, idx) => {
      tierScoreMap[t.id] = medianIndex - idx
  })

  // Calculate scores for ALL items in this list to determine relative rank
  const itemScores: Record<string, { total: number, count: number }> = {}
  
  listVotes.forEach(vi => {
      if (!itemScores[vi.item_id]) itemScores[vi.item_id] = { total: 0, count: 0 }
      const score = tierScoreMap[vi.tier_id] || 0
      itemScores[vi.item_id].total += score
      itemScores[vi.item_id].count += 1
  })

  // Target Item Stats
  const targetStats = itemScores[targetItemId]
  if (!targetStats) return { absolute: null, relative: null }

  const targetAvg = targetStats.total / targetStats.count

  // --- Absolute Rank ---
  // score = median - index  =>  index = median - score
  let absTierIdx = Math.round(medianIndex - targetAvg)
  absTierIdx = Math.max(0, Math.min(numTiers - 1, absTierIdx))
  const absoluteTier = listTiers[absTierIdx]

  // --- Relative Rank ---
  let maxAvg = -Infinity
  let minAvg = Infinity
  
  // Check stats for all items involved in votes
  Object.values(itemScores).forEach(stats => {
      const avg = stats.total / stats.count
      if (avg > maxAvg) maxAvg = avg
      if (avg < minAvg) minAvg = avg
  })

  let relTierIdx = 0
  const range = maxAvg - minAvg
  
  if (range === 0) {
      relTierIdx = 0
  } else {
      const normalized = (targetAvg - minAvg) / range
      const rawIdx = Math.floor((1 - normalized) * numTiers)
      relTierIdx = Math.min(numTiers - 1, Math.max(0, rawIdx))
  }
  const relativeTier = listTiers[relTierIdx]

  return { absolute: absoluteTier, relative: relativeTier }
}


export default async function ItemDetailPage(props: Props) {
  const params = await props.params;
  const itemName = decodeURIComponent(params.name)
  const supabase = await createClient()

  // 1. Fetch Item Occurrences (Items with the same name in different lists)
  const { data: itemOccurrences, error } = await supabase
    .from('items')
    .select(`
      id,
      name,
      image_url,
      tier_list_id,
      tier_lists (
        id,
        title,
        description,
        vote_count,
        users ( full_name )
      )
    `)
    .eq('name', itemName)

  if (error || !itemOccurrences || itemOccurrences.length === 0) {
    notFound()
  }

  // Increment item view count
  await supabase.rpc('increment_item_view', { item_name: itemName })

  // Sort by vote count (descending)
  const sortedOccurrences = itemOccurrences.sort((a, b) => {
    const aTierList = a.tier_lists as any;
    const bTierList = b.tier_lists as any;
    const aVoteCount = Array.isArray(aTierList) ? aTierList[0]?.vote_count : aTierList?.vote_count;
    const bVoteCount = Array.isArray(bTierList) ? bTierList[0]?.vote_count : bTierList?.vote_count;
    return (bVoteCount || 0) - (aVoteCount || 0);
  });

  // Collect all images from items that have images
  const itemImages = sortedOccurrences
    .filter(item => item.image_url)
    .map(item => item.image_url);

  const tierListIds = sortedOccurrences.map(i => i.tier_list_id)

  // 2. Fetch ALL Tiers for these lists
  const { data: allTiers } = await supabase
    .from('tiers')
    .select('*')
    .in('tier_list_id', tierListIds)
    .order('order')

  // 3. Fetch ALL Votes for these lists
  // Note: This can be heavy. Optimizations needed for production (e.g., materialized views).
  const { data: allVoteItems } = await supabase
    .from('vote_items')
    .select(`
      item_id,
      tier_id,
      votes!inner (
        tier_list_id
      )
    `)
    .in('votes.tier_list_id', tierListIds)

  // 4. Fetch Comments
  const { data: comments } = await supabase
    .from('comments')
    .select(`
      *,
      users (
        full_name,
        avatar_url
      ),
      likes (
        user_id
      ),
      dislikes (
        user_id
      )
    `)
    .eq('item_name', itemName)
    .order('created_at', { ascending: false })

  // 5. Fetch Related Items
  let relatedItems: any[] = []
  
  if (tierListIds.length > 0) {
      // A. Items in same tier lists
      const { data: sameListItems } = await supabase
        .from('items')
        .select('name, image_url')
        .in('tier_list_id', tierListIds)
        .neq('name', itemName)
        .limit(50)

      // B. Items from tier lists with same tags
      // Get tags first
      const { data: currentTags } = await supabase
        .from('tier_list_tags')
        .select('tag_id')
        .in('tier_list_id', tierListIds)
      
      const currentTagIds = currentTags?.map(t => t.tag_id) || []
      let tagItems: any[] = []

      if (currentTagIds.length > 0) {
          // Find other tier lists with these tags
          const { data: tagTierLists } = await supabase
            .from('tier_list_tags')
            .select('tier_list_id')
            .in('tag_id', currentTagIds)
            .limit(50) // Limit tier lists
          
          const tagTierListIds = tagTierLists?.map(t => t.tier_list_id).filter(id => !tierListIds.includes(id)) || [] // Exclude original lists

          if (tagTierListIds.length > 0) {
              const { data: itemsFromTags } = await supabase
                .from('items')
                .select('name, image_url')
                .in('tier_list_id', tagTierListIds)
                .neq('name', itemName)
                .limit(50)
              
              tagItems = itemsFromTags || []
          }
      }

      // Combine and Unique by name
      const allCandidates = [...(sameListItems || []), ...tagItems]
      
      // Sort: Items with images first
      allCandidates.sort((a, b) => {
          if (a.image_url && !b.image_url) return -1
          if (!a.image_url && b.image_url) return 1
          return 0
      })

      const uniqueMap = new Map()
      allCandidates.forEach(item => {
          if (!uniqueMap.has(item.name)) {
              uniqueMap.set(item.name, item)
          }
      })
      
      relatedItems = Array.from(uniqueMap.values()).slice(0, 10)

      if (relatedItems.length > 0) {
          const amazonAds = [
              { isAmazonBookAd: true },
              { isAmazonFurusatoAd: true },
              { isAmazonRankingAd: true },
              { isAmazonTimesaleAd: true }
          ];
          const randomAd = amazonAds[Math.floor(Math.random() * amazonAds.length)];
          const randomIndex = Math.floor(Math.random() * (relatedItems.length + 1));
          relatedItems.splice(randomIndex, 0, randomAd);
      }
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Find top comment (Popular sort logic: Most likes, then fewest dislikes)
  const topComment = comments?.filter((c: any) => !c.parent_id).sort((a: any, b: any) => {
     if ((b.like_count || 0) !== (a.like_count || 0)) {
         return (b.like_count || 0) - (a.like_count || 0)
     }
     return (a.dislike_count || 0) - (b.dislike_count || 0)
  })[0]

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <HomeWrapper uniqueKey="item-detail">
      <SaveItemToHistory itemName={itemName} imageUrl={itemImages[0] || null} />
      <BackButton />
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-12">
        <div className="w-48 h-48 relative rounded-xl overflow-hidden shadow-lg flex-shrink-0 bg-gray-100 mx-auto md:mx-0">
           <ImageSlideshow images={itemImages} itemName={itemName} />
        </div>

        <div className="flex-grow text-center md:text-left">
           <h1 className="text-4xl font-bold mb-4">{itemName}</h1>
           <p className="text-gray-500 text-lg">
             登場回数：{sortedOccurrences.length}
           </p>
        </div>
      </div>

      {/* Top Comment Section */}
      {topComment && (
        <div className="mb-16">
            <div className="bg-transparent p-4 rounded-xl border border-amber-200 dark:border-amber-900 w-full shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-500 font-bold text-lg">
                    <span>🏆</span>
                    <span>トップコメント</span>
                </div>
                
                {/* Comment Content */}
                <div className="text-base md:text-lg text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed px-1">
                    {topComment.content}
                </div>

                {/* Footer: Author & Link */}
                <div className="flex items-center justify-between border-t border-amber-200/50 dark:border-amber-900/50 pt-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 relative rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                            {topComment.users?.avatar_url ? (
                                <Image
                                    src={topComment.users.avatar_url}
                                    alt={topComment.users.full_name || 'User'}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <span className="flex items-center justify-center w-full h-full text-gray-500 text-xs font-bold">
                                    {topComment.users?.full_name?.[0] || 'U'}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {topComment.users?.full_name || '名無し'}
                        </span>
                    </div>

                    {/* Link */}
                    <a href="#comments" className="text-sm text-amber-600/70 hover:text-amber-600 underline flex-shrink-0 ml-4">
                        コメント欄で見る
                    </a>
                </div>
            </div>
        </div>
      )}

      {/* Cross Reference List */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6 border-b pb-2">成績</h2>
        <div className="grid gap-4">
           {sortedOccurrences.map((item: any) => {
              const tierList = Array.isArray(item.tier_lists) ? item.tier_lists[0] : item.tier_lists;
              const listUser = Array.isArray(tierList?.users) ? tierList.users[0] : tierList?.users;
              
              // Calculate Ranks
              const ranks = calculateRanks(
                  item.id,
                  item.tier_list_id,
                  allTiers || [],
                  (allVoteItems as any) || [],
                  [] // We don't strictly need all items list for relative calc if we trust vote_items covers the range well enough, or we accept only voted items matter.
              )

              return (
              <Link 
                key={item.id} 
                href={`/tier-lists/${item.tier_list_id}`}
                className="block bg-white dark:bg-zinc-900 border rounded-lg p-4 hover:shadow-md transition group"
              >
                 <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-lg group-hover:text-blue-600 transition">
                            {tierList?.title || 'Untitled List'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            by {listUser?.full_name || 'Unknown'}
                        </p>
                    </div>
                    
                    <div className="flex flex-row items-center gap-6">
                       {/* Absolute Rank */}
                       <div className="flex flex-col items-center">
                           <span className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">絶対評価</span>
                           {ranks.absolute ? (
                               <span 
                                 className="px-4 py-2 rounded-md font-bold text-xl min-w-[50px] text-center shadow-sm"
                                 style={{ 
                                     backgroundColor: ranks.absolute.color || '#ddd',
                                     color: getContrastColor(ranks.absolute.color || '#ddd')
                                 }}
                               >
                                  {ranks.absolute.name}
                               </span>
                           ) : (
                               <span className="text-xl text-gray-300 font-bold">-</span>
                           )}
                       </div>

                       {/* Relative Rank */}
                       <div className="flex flex-col items-center">
                           <span className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">相対評価</span>
                           {ranks.relative ? (
                               <span 
                                 className="px-4 py-2 rounded-md font-bold text-xl min-w-[50px] text-center shadow-sm"
                                 style={{ 
                                     backgroundColor: ranks.relative.color || '#ddd',
                                     color: getContrastColor(ranks.relative.color || '#ddd')
                                 }}
                               >
                                  {ranks.relative.name}
                               </span>
                           ) : (
                               <span className="text-xl text-gray-300 font-bold">-</span>
                           )}
                       </div>
                    </div>
                 </div>
              </Link>
           );
           })}
        </div>
      </div>

      {/* Related Items */}
      {relatedItems.length > 0 && (
        <div className="mb-12 border-t pt-8">
          <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold">関連アイテム</h2>
            <RandomAffiliateLink index={200} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {relatedItems.map((item: any, index: number) => {
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

              return (
              <Link href={`/items/${encodeURIComponent(item.name)}`} key={item.name} className="group">
                <div className="aspect-square bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative shadow-sm hover:shadow-md transition">
                   {item.image_url ? (
                     <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-white dark:bg-zinc-700 text-gray-400">
                       {item.name[0]}
                     </div>
                   )}
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <div className="mt-2 text-sm font-medium text-center truncate px-1 group-hover:text-indigo-600 transition-colors">
                  {item.name}
                </div>
              </Link>
            )})}
          </div>
        </div>
      )}

      {/* Comments */}
      <div id="comments" className="border-t pt-8">
         <CommentSection 
            initialComments={comments || []}
            itemName={itemName}
            currentUserId={user?.id}
         />
      </div>
      </HomeWrapper>
    </div>
  )
}
