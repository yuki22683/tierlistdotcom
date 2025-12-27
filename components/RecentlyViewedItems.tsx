'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RandomAffiliateLink from './RandomAffiliateLink'
import Pagination from './Pagination'

interface ItemData {
  name: string
  image_url: string | null
}

export default function RecentlyViewedItems({
  affiliateIndex = 2,
  view,
  page = 1,
  limit = 7
}: {
  affiliateIndex?: number,
  view?: string,
  page?: number,
  limit?: number
}) {
  const [items, setItems] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentlyViewedItems = async () => {
      try {
        const historyKey = 'viewedItems'
        let historyData = JSON.parse(localStorage.getItem(historyKey) || '[]')
        setTotalCount(historyData.length)

        if (historyData.length === 0) {
          setLoading(false)
          return
        }

        // Apply pagination
        const offset = (page - 1) * limit;
        const slicedData = historyData.slice(offset, offset + limit);

        if (slicedData.length === 0) {
          setItems([])
          setLoading(false)
          return
        }

        if (slicedData.length > 0) {
            if (view) {
                // Filtered mode: Insert all 4 ads
                const ads = [
                    { isAmazonBookAd: true },
                    { isAmazonFurusatoAd: true },
                    { isAmazonRankingAd: true },
                    { isAmazonTimesaleAd: true }
                ];
                ads.forEach(ad => {
                    const idx = Math.floor(Math.random() * (slicedData.length + 1));
                    slicedData.splice(idx, 0, ad);
                });
            } else {
                // Default mode: Insert 1 ad (Book)
                const randomIndex = Math.floor(Math.random() * (slicedData.length + 1));
                slicedData.splice(randomIndex, 0, { isAmazonBookAd: true });
            }
        }

        setItems(slicedData)
      } catch (e) {
        console.error('Error in recently viewed items:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentlyViewedItems()
  }, [view, page])

  const renderAmazonAd = (item: any, keyPrefix: string) => {
      const cardClass = "group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all aspect-square flex flex-col";
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

  if (loading) return null

  // Filter out ads to check if there are any real items
  const realItems = items.filter(item =>
    !item.isAmazonBookAd &&
    !item.isAmazonFurusatoAd &&
    !item.isAmazonRankingAd &&
    !item.isAmazonTimesaleAd
  )

  if (realItems.length === 0) return null

  return (
    <div className="mb-12">
      <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
        <Link href="/?view=recent-items" className="cursor-pointer hover:underline inline-block">
            <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>📋</span> 最近見たアイテム
            </h2>
        </Link>
        <RandomAffiliateLink index={affiliateIndex} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item, index) => {
          const ad = renderAmazonAd(item, `recent-item-${index}`);
          if (ad) return ad;
          return (
            <Link
              key={`${item.name}-${index}`}
              href={`/items/${encodeURIComponent(item.name)}`}
              className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all aspect-square flex flex-col"
            >
                {item.image_url ? (
                    <div className="relative w-full h-full">
                        <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                            <h3 className="text-white font-bold text-sm truncate">{item.name}</h3>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-muted text-center">
                        <h3 className="font-bold text-sm line-clamp-2">{item.name}</h3>
                    </div>
                )}
            </Link>
          )
        })}
      </div>

      {view === 'recent-items' && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalCount / limit)}
          baseUrl={`/?view=recent-items`}
        />
      )}
    </div>
  )
}
