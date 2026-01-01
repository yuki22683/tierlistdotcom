'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import TierListCard from './TierListCard'
import RandomAffiliateLink from './RandomAffiliateLink'
import Pagination from './Pagination'

export default function RecentlyViewed({
  isAdmin,
  currentUserId,
  affiliateIndex = 1,
  view,
  page = 1,
  limit = 8
}: {
  isAdmin?: boolean,
  currentUserId?: string,
  affiliateIndex?: number,
  view?: string,
  page?: number,
  limit?: number
}) {
  const [tierLists, setTierLists] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userVotedTierListIds, setUserVotedTierListIds] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      try {
        const historyKey = 'viewedTierLists'
        let historyIds = JSON.parse(localStorage.getItem(historyKey) || '[]')
        setTotalCount(historyIds.length)

        if (historyIds.length === 0) {
          setLoading(false)
          return
        }

        // Fetch user votes if logged in
        if (currentUserId) {
          const { data: userVotes } = await supabase
            .from('votes')
            .select('tier_list_id')
            .eq('user_id', currentUserId)

          setUserVotedTierListIds(userVotes?.map(v => v.tier_list_id) || [])
        }

        // Apply pagination
        const offset = (page - 1) * limit;
        const slicedIds = historyIds.slice(offset, offset + limit);

        if (slicedIds.length === 0) {
          setTierLists([])
          setLoading(false)
          return
        }

        // Fetch tier lists using RPC for optimized thumbnail selection
        const { data, error } = await supabase
          .rpc('search_tier_lists', {
            ids_filter: slicedIds,
            sort_by: 'none',
            limit_count: limit,
            offset_val: 0 // offset is handled by slicedIds
          })

        if (error) {
          console.error('Error fetching recently viewed:', error)
          setLoading(false)
          return
        }

        // Sort by history order (RPC result might not be in order of slicedIds)
        const sortedData = slicedIds
          .map((id: string) => data.find((list: any) => list.id === id))
          .filter(Boolean)

        // Add ads to the data
        const result = [...sortedData];

        if (view) {
            // Filtered mode: Insert all 4 ads
            if (result.length > 0) {
                const ads = [
                    { isAmazonBookAd: true },
                    { isAmazonFurusatoAd: true },
                    { isAmazonRankingAd: true },
                    { isAmazonTimesaleAd: true }
                ];
                ads.forEach(ad => {
                    const idx = Math.floor(Math.random() * (result.length + 1));
                    result.splice(idx, 0, ad);
                });
            }
        } else {
            // Default mode: Always insert 1 ad (Furusato) regardless of data length
            if (result.length > 0) {
                const randomIndex = Math.floor(Math.random() * (result.length + 1));
                result.splice(randomIndex, 0, { isAmazonFurusatoAd: true });
                console.log('[RecentlyViewed] Added ad, total items:', result.length);
            }
        }

        setTierLists(result)
      } catch (e) {
        console.error('Error in recently viewed:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentlyViewed()
  }, [view, page, limit])

  const renderAmazonAd = (item: any, keyPrefix: string) => {
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

      if (!href) return null;

      return (
        <a key={`${keyPrefix}-ad`} href={href} target="_blank" rel="nofollow sponsored noopener" className={cardClass}>
          <img src={src} alt="Amazon" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
            PR
          </div>
        </a>
      );
  }

  if (loading) return null // Or a skeleton
  
  // Filter out ads to check if there are any real tier lists
  const realItems = tierLists.filter(item => 
    !item.isAmazonBookAd && 
    !item.isAmazonFurusatoAd && 
    !item.isAmazonRankingAd && 
    !item.isAmazonTimesaleAd
  )

  if (realItems.length === 0) return null

  return (
    <div className="mb-12">
      <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
        <Link href="/?view=recent" className="cursor-pointer hover:underline inline-block">
            <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>🕒</span> 最近見たティアリスト
            </h2>
        </Link>
        <RandomAffiliateLink index={affiliateIndex} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {tierLists.map((list, index) => {
          const ad = renderAmazonAd(list, `recent-${index}`);
          if (ad) return ad;
          const userHasVoted = userVotedTierListIds.includes(list.id);
          return (
            <TierListCard
                key={list.id}
                list={list}
                isAdmin={!!isAdmin}
                currentUserId={currentUserId}
                userHasVoted={userHasVoted}
            />
          )
        })}
      </div>

      {view === 'recent' && (
        <Pagination 
          currentPage={page} 
          totalPages={Math.ceil(totalCount / limit)} 
          baseUrl={`/?view=recent`} 
        />
      )}
    </div>
  )
}
