import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import TierListCard from '@/components/TierListCard'
import CreateTierListButton from '@/components/CreateTierListButton'
import RecentlyViewed from '@/components/RecentlyViewed'
import RecentlyViewedItems from '@/components/RecentlyViewedItems'
import RandomAffiliateLink from '@/components/RandomAffiliateLink'
import HomeWrapper from '@/components/HomeWrapper'
import BackButton from '@/components/BackButton'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Pagination from '@/components/Pagination'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const resolvedSearchParams = await searchParamsPromise;
  const view = resolvedSearchParams.view;
  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const limit = view ? 100 : view === 'items' ? 7 : 11;
  const offset = (page - 1) * limit;

  const supabase = await createClient()

  let popularTierLists: any[] = []
  let trendingTierLists: any[] = []
  let newTierLists: any[] = []
  let popularItems: any[] = []
  let trendingItems: any[] = []
  let popularTags: any[] = []
  let trendingTags: any[] = []
  let totalCount = 0

  const fetchPopular = !view || view === 'popular';
  const fetchTrending = !view || view === 'trending';
  const fetchNew = !view || view === 'new';
  const fetchItems = !view || view === 'items';
  const fetchTrendingItems = !view || view === 'trending-items';
  const fetchTags = !view || view === 'tags';
  const fetchTrendingTags = !view || view === 'trending-tags';
  const fetchRecentItems = !view || view === 'recent-items';

  // Fetch Total Counts if view is active
  if (view) {
      if (fetchPopular || fetchTrending || fetchNew) {
          const { count } = await supabase.from('tier_lists').select('*', { count: 'exact', head: true });
          totalCount = count || 0;
      } else if (fetchItems) {
          const { data } = await supabase.rpc('get_popular_items_count');
          totalCount = Number(data) || 0;
      } else if (fetchTrendingItems) {
          const { data } = await supabase.rpc('get_trending_items_count');
          totalCount = Number(data) || 0;
      } else if (fetchTags) {
          const { data } = await supabase.rpc('get_popular_tags_count');
          totalCount = Number(data) || 0;
      } else if (fetchTrendingTags) {
          const { data } = await supabase.rpc('get_trending_tags_count');
          totalCount = Number(data) || 0;
      }
  }

  // Amazon Ads Definition
  const amazonAds = [
      { isAmazonBookAd: true },
      { isAmazonFurusatoAd: true },
      { isAmazonRankingAd: true },
      { isAmazonTimesaleAd: true }
  ];

  // Helper to insert all ads randomly
  const insertAds = (list: any[]) => {
      amazonAds.forEach(ad => {
          if (list.length > 0) {
              const idx = Math.floor(Math.random() * (list.length + 1));
              list.splice(idx, 0, ad);
          } else {
             list.push(ad);
          }
      })
  }

  if (fetchPopular) {
    const { data, error } = await supabase.rpc('get_home_tier_lists', { sort_type: 'popular', limit_count: limit, offset_val: offset });
    popularTierLists = data || [];
    if (error) {
      console.warn("RPC 'get_home_tier_lists' failed (popular), falling back:", error.message);
      const { data: fallbackData } = await supabase.from('tier_lists').select('*, users(full_name, avatar_url), items(image_url)').order('vote_count', { ascending: false }).range(offset, offset + limit - 1);
      popularTierLists = fallbackData || [];
    }

    if (view) {
        insertAds(popularTierLists);
    } else if (popularTierLists.length > 0) {
        const randomIndex = Math.floor(Math.random() * (popularTierLists.length + 1));
        popularTierLists.splice(randomIndex, 0, { isAmazonTimesaleAd: true });
    }
  }

  if (fetchTrending) {
    const { data, error } = await supabase.rpc('get_home_tier_lists', { sort_type: 'trending', limit_count: limit, offset_val: offset });
    trendingTierLists = data || [];
    if (error) {
      console.warn("RPC 'get_home_tier_lists' failed (trending), falling back:", error.message);
      const { data: fallbackData } = await supabase.from('tier_lists').select('*, users(full_name, avatar_url), items(image_url)').order('view_count', { ascending: false }).range(offset, offset + limit - 1);
      trendingTierLists = fallbackData || [];
    }

    if (view) {
        insertAds(trendingTierLists);
    } else if (trendingTierLists.length > 0) {
        const randomIndex = Math.floor(Math.random() * (trendingTierLists.length + 1));
        trendingTierLists.splice(randomIndex, 0, { isAmazonFurusatoAd: true });
    }
  }

  if (fetchNew) {
    const { data, error } = await supabase.rpc('get_home_tier_lists', { sort_type: 'new', limit_count: limit, offset_val: offset });
    newTierLists = data || [];
    if (error) {
      console.warn("RPC 'get_home_tier_lists' failed (new), falling back:", error.message);
      const { data: fallbackData } = await supabase.from('tier_lists').select('*, users(full_name, avatar_url), items(image_url)').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      newTierLists = fallbackData || [];
    }

    if (view) {
        insertAds(newTierLists);
    } else if (newTierLists.length > 0) {
        const randomIndex1 = Math.floor(Math.random() * (newTierLists.length + 1));
        newTierLists.splice(randomIndex1, 0, { isAmazonRankingAd: true });
    }
  }

  if (fetchItems) {
    const { data } = await supabase.rpc('get_popular_items', { limit_count: limit, offset_val: offset });
    // Filter out items with empty names
    popularItems = (data || []).filter((item: any) => item.name && item.name.trim() !== '');

    if (view) {
        insertAds(popularItems);
    } else if (popularItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * (popularItems.length + 1));
        popularItems.splice(randomIndex, 0, { isAmazonBookAd: true });
    }
  }

  if (fetchTrendingItems) {
    const { data, error } = await supabase.rpc('get_trending_items', { limit_count: limit, offset_val: offset });

    if (error) {
      console.error('[Server] Error fetching trending items:', error.message, error.details, error.hint);
      // エラーの場合は空の配列を使用
      trendingItems = [];
    } else {
      // Filter out items with empty names
      trendingItems = (data || []).filter((item: any) => item.name && item.name.trim() !== '');
      console.log('[Server] Trending items fetched:', trendingItems.length, 'items', data?.slice(0, 3));
    }

    if (view) {
        insertAds(trendingItems);
    } else if (trendingItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * (trendingItems.length + 1));
        trendingItems.splice(randomIndex, 0, { isAmazonTimesaleAd: true });
    }
  }

  if (fetchTags) {
    const { data } = await supabase.rpc('get_popular_tags', { limit_count: limit, offset_val: offset });
    popularTags = data || [];
  }

  if (fetchTrendingTags) {
    const { data } = await supabase.rpc('get_trending_tags', { limit_count: limit, offset_val: offset });
    trendingTags = data || [];
  }

  // Check Authentication & Admin & Ban Status
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  let isBanned = false
  let dailyLimitReached = false
  let userVotedTierListIds: string[] = []

  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin, is_banned')
      .eq('id', user.id)
      .single()

    isAdmin = !!userProfile?.is_admin
    isBanned = !!userProfile?.is_banned

    // Check daily limit (Skip for admins)
    if (!isAdmin) {
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        const { count } = await supabase
            .from('tier_lists')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', today)

        if ((count || 0) >= 20) {
            dailyLimitReached = true
        }
    }

    // Get tier list IDs that the user has voted on
    const { data: userVotes } = await supabase
      .from('votes')
      .select('tier_list_id')
      .eq('user_id', user.id)

    userVotedTierListIds = userVotes?.map(v => v.tier_list_id) || []
  }

  const renderAmazonAd = (item: any, keyPrefix: string, isItemCard: boolean = false) => {
      const cardClass = isItemCard 
        ? "group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all aspect-square flex flex-col"
        : "group flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all relative h-full w-full aspect-video";

      let href = "";
      let src = "";
      let title = "Amazon";

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
          <img src={src} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
            PR
          </div>
        </a>
      );
  }

  return (
    <main key={view} className="container mx-auto pb-10 pt-4 px-4 max-w-5xl">
      <HomeWrapper uniqueKey={view || 'home'}>
      {/* Fixed Create Button */}
      <CreateTierListButton 
          isLoggedIn={!!user} 
          isBanned={isBanned} 
          dailyLimitReached={dailyLimitReached} 
          affiliateIndex={0}
      />

      {/* Recently Viewed */}
      {(!view || view === 'recent') && (
        <RecentlyViewed
          isAdmin={isAdmin}
          currentUserId={user?.id}
          affiliateIndex={1}
          view={view}
          page={page}
          limit={limit}
        />
      )}

      {/* Recently Viewed Items */}
      {fetchRecentItems && (
        <RecentlyViewedItems
          affiliateIndex={2}
          view={view}
          page={page}
          limit={7}
        />
      )}

      {/* Popular Section */}
      {fetchPopular && (
        <section className="mb-12">
          {view === 'popular' && <BackButton href="/" />}
          <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
            <a href="/?view=popular" className="cursor-pointer hover:underline">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-yellow-500">🏆</span> 人気のティアリスト
                </h2>
            </a>
            <RandomAffiliateLink index={3} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {popularTierLists.map((list: any, index: number) => {
              const ad = renderAmazonAd(list, `popular-${index}`);
              if (ad) return ad;
              const userHasVoted = userVotedTierListIds.includes(list.id);
              return <TierListCard key={list.id} list={list} isAdmin={isAdmin} currentUserId={user?.id} userHasVoted={userHasVoted} />
            })}
            {popularTierLists.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  まだ人気ランキングがありません。
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trending Section */}
      {fetchTrending && (
        <section className="mb-12">
          {view === 'trending' && <BackButton href="/" />}
          <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
            <a href="/?view=trending" className="cursor-pointer hover:underline">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-orange-500">👀</span> 注目のティアリスト
                </h2>
            </a>
            <RandomAffiliateLink index={4} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {trendingTierLists.map((list: any, index: number) => {
              const ad = renderAmazonAd(list, `trending-${index}`);
              if (ad) return ad;
              const userHasVoted = userVotedTierListIds.includes(list.id);
              return <TierListCard key={list.id} list={list} isAdmin={isAdmin} currentUserId={user?.id} userHasVoted={userHasVoted} />
            })}
            {trendingTierLists.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  まだ注目ランキングがありません。
              </div>
            )}
          </div>
        </section>
      )}

      {/* New Section */}
      {fetchNew && (
        <section className="mb-12">
          {view === 'new' && <BackButton href="/" />}
          <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
            <a href="/?view=new" className="cursor-pointer hover:underline">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-blue-500">🆕</span> 新しいティアリスト
                </h2>
            </a>
            <RandomAffiliateLink index={5} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {newTierLists.map((list: any, index: number) => {
              const ad = renderAmazonAd(list, `new-${index}`);
              if (ad) return ad;
              const userHasVoted = userVotedTierListIds.includes(list.id);
              return <TierListCard key={list.id} list={list} isAdmin={isAdmin} currentUserId={user?.id} userHasVoted={userHasVoted} />
            })}
            {newTierLists.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  まだ投稿がありません。
              </div>
            )}
          </div>
        </section>
      )}

      {/* Popular Tags Section */}
      {fetchTags && popularTags.length > 0 && (
          <section className="mb-12">
            {view === 'tags' && <BackButton href="/" />}
            <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
                <a href="/?view=tags" className="cursor-pointer hover:underline">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-green-500">🏷️</span> 人気のタグ
                </h2>
                </a>
                <RandomAffiliateLink index={6} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {popularTags.map((tag: any) => (
                <Link 
                  key={tag.id} 
                  href={`/search?tag=${encodeURIComponent(tag.name)}`}
                  className="flex flex-col p-4 bg-card border rounded-lg hover:bg-accent/50 hover:border-primary/50 transition-colors"
                >
                    <span className="font-bold text-base truncate mb-1">#{tag.name}</span>
                    <span className="text-xs text-muted-foreground">{tag.total_votes} 票</span>
                </Link>
              ))}
            </div>
          </section>
      )}

      {/* Trending Tags Section */}
      {fetchTrendingTags && trendingTags.length > 0 && (
          <section className="mb-12">
            {view === 'trending-tags' && <BackButton href="/" />}
            <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
                <a href="/?view=trending-tags" className="cursor-pointer hover:underline">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-cyan-500">🔖</span> 注目のタグ
                </h2>
                </a>
                <RandomAffiliateLink index={7} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {trendingTags.map((tag: any) => (
                <Link
                  key={tag.id}
                  href={`/search?tag=${encodeURIComponent(tag.name)}`}
                  className="flex flex-col p-4 bg-card border rounded-lg hover:bg-accent/50 hover:border-primary/50 transition-colors"
                >
                    <span className="font-bold text-base truncate mb-1">#{tag.name}</span>
                    <span className="text-xs text-muted-foreground">{tag.total_views} 閲覧</span>
                </Link>
              ))}
            </div>
          </section>
      )}

      {/* Popular Items Section */}
      {fetchItems && popularItems.length > 0 && (
          <section className="mb-12">
            {view === 'items' && <BackButton href="/" />}
            <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
                <a href="/?view=items" className="cursor-pointer hover:underline">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-purple-500">🔥</span> 人気のアイテム
                </h2>
                </a>
                <RandomAffiliateLink index={8} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {popularItems.map((item: any, index: number) => {
                const ad = renderAmazonAd(item, `item-${index}`, true);
                if (ad) return ad;
                return (
                <Link 
                  key={item.name} 
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
                                <p className="text-white/80 text-xs">{item.total_votes} 票</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-muted text-center">
                            <h3 className="font-bold text-sm line-clamp-2">{item.name}</h3>
                            <p className="text-muted-foreground text-xs mt-1">{item.total_votes} 票</p>
                        </div>
                    )}
                </Link>
                )
              })}
            </div>
          </section>
      )}

      {/* Trending Items Section */}
      {fetchTrendingItems && (
          <section className="mb-12">
            {view === 'trending-items' && <BackButton href="/" />}
            <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 mb-6">
                <a href="/?view=trending-items" className="cursor-pointer hover:underline">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-pink-500">👁️</span> 注目のアイテム
                </h2>
                </a>
                <RandomAffiliateLink index={9} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {trendingItems.map((item: any, index: number) => {
                const ad = renderAmazonAd(item, `trending-item-${index}`, true);
                if (ad) return ad;
                return (
                <Link
                  key={item.name}
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
                                <p className="text-white/80 text-xs">{item.total_detail_views} 閲覧</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-muted text-center">
                            <h3 className="font-bold text-sm line-clamp-2">{item.name}</h3>
                            <p className="text-muted-foreground text-xs mt-1">{item.total_detail_views} 閲覧</p>
                        </div>
                    )}
                </Link>
                )
              })}
              {trendingItems.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    まだ注目アイテムがありません。
                </div>
              )}
            </div>
          </section>
      )}
      {view && view !== 'recent' && (
        <Pagination 
          currentPage={page} 
          totalPages={Math.ceil(totalCount / limit)} 
          baseUrl={`/?view=${view}`} 
        />
      )}
      </HomeWrapper>
    </main>
  )
}