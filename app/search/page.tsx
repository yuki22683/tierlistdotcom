import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import TierListCard from '@/components/TierListCard'
import { Tag, ArrowLeft } from 'lucide-react'
import HomeWrapper from '@/components/HomeWrapper'
import Pagination from '@/components/Pagination'
import BackButton from '@/components/BackButton'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<{ q?: string; tag?: string; section?: string; page?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, tag } = await searchParams
  
  if (tag) {
    return {
      title: `${tag}のティアリスト一覧・ランキング | ティアリスト.com`,
      description: `${tag}に関連するティアリスト（ランキング）の一覧です。みんなが作成したティアリストをチェックして、投票に参加しましょう。`,
      openGraph: {
        title: `${tag}のティアリスト一覧・ランキング`,
        description: `${tag}に関連するティアリストの一覧です。`,
      }
    }
  }

  if (q) {
    return {
      title: `「${q}」の検索結果 | ティアリスト.com`,
      description: `「${q}」に関連するティアリスト、アイテム、タグの検索結果を表示しています。`,
      robots: {
        index: false, // 検索結果の検索ページは基本インデックスさせない（タグページのみインデックスさせる戦略）
        follow: true,
      }
    }
  }

  return {
    title: '検索 | ティアリスト.com',
    description: 'キーワードやタグから、アニメ、ゲーム、あらゆるジャンルのティアリストを検索できます。',
  }
}

export default async function SearchPage(props: Props) {
  const searchParams = await props.searchParams;
  const query = searchParams.q || ''
  const tagQuery = searchParams.tag || ''
  const section = searchParams.section || ''
  const page = parseInt(searchParams.page || '1', 10)
  const limit = section ? 100 : 20
  const offset = (page - 1) * limit
  
  const supabase = await createClient()

  let tierListResults: any[] = []
  let itemResults: any[] = []
  let tagResults: any[] = []
  let title = ''
  let totalCount = 0
  let tierListsTotalCount = 0
  let itemsTotalCount = 0
  let tagsTotalCount = 0

  // Determine which sections to fetch
  const fetchTierLists = !section || section === 'tierlists'
  const fetchItems = !section || section === 'items'
  const fetchTags = !section || section === 'tags'

  if (tagQuery) {
      title = `#${tagQuery} の検索結果`

      if (fetchTierLists) {
        // Always fetch total count for tier lists
        const { count } = await supabase
          .from('tier_lists')
          .select('*, tier_list_tags!inner(tags!inner(name))', { count: 'exact', head: true })
          .eq('tier_list_tags.tags.name', tagQuery)
        tierListsTotalCount = count || 0
        // Set totalCount for tag query pagination
        totalCount = tierListsTotalCount
        console.log(`[Tag Search] Total tier lists count: ${tierListsTotalCount}`)

        const { data, error } = await supabase
          .rpc('search_tier_lists', {
            search_tag: tagQuery,
            sort_by: 'popular',
            limit_count: limit,
            offset_val: offset
          })

        if (!error && data) {
            tierListResults = data
            console.log(`[Tag Search] Fetched ${tierListResults.length} tier lists`)
        } else if (error) {
            console.error("Tag search error:", error)
        }
      }

  } else if (query) {
    title = `"${query}" の検索結果`

    // Fetch tier lists
    if (fetchTierLists) {
      // Always fetch total count for tier lists
      const { count } = await supabase
        .from('tier_lists')
        .select('*', { count: 'exact', head: true })
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      tierListsTotalCount = count || 0
      if (section === 'tierlists') {
        totalCount = tierListsTotalCount
      }
      console.log(`[Keyword Search - TierLists] Total count: ${tierListsTotalCount}`)

      const { data, error } = await supabase
        .rpc('search_tier_lists', {
            search_query: query,
            sort_by: 'popular',
            limit_count: limit,
            offset_val: offset
        })

      if (!error && data) {
        tierListResults = data
        console.log(`[Keyword Search - TierLists] Fetched ${tierListResults.length} tier lists`)
      }
    }

    // Fetch items
    if (fetchItems) {
      // Always fetch total count for items
      const { data: countData } = await supabase
        .rpc('search_popular_items_count', { search_query: query })
      itemsTotalCount = Number(countData) || 0
      if (section === 'items') {
        totalCount = itemsTotalCount
      }
      console.log(`[Keyword Search - Items] Total count: ${itemsTotalCount}`)

      const { data, error } = await supabase
        .rpc('search_popular_items', { search_query: query, limit_count: limit, offset_val: offset })

      if (!error && data) {
        itemResults = data
        console.log(`[Keyword Search - Items] Fetched ${itemResults.length} items`)
      }
    }

    // Fetch tags
    if (fetchTags) {
      // Always fetch total count for tags
      const { data: countData } = await supabase
        .rpc('search_popular_tags_count', { search_query: query })
      tagsTotalCount = Number(countData) || 0
      if (section === 'tags') {
        totalCount = tagsTotalCount
      }
      console.log(`[Keyword Search - Tags] Total count: ${tagsTotalCount}`)

      const { data, error } = await supabase
        .rpc('search_popular_tags', { search_query: query, limit_count: limit, offset_val: offset })

      if (!error && data) {
        tagResults = data
        console.log(`[Keyword Search - Tags] Fetched ${tagResults.length} tags`)
      }
    }
  } else {
      title = '検索'
  }

  // Check Admin Status
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  let userVotedTierListIds: string[] = []

  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    isAdmin = !!userProfile?.is_admin

    // Get tier list IDs that the user has voted on
    const { data: userVotes } = await supabase
      .from('votes')
      .select('tier_list_id')
      .eq('user_id', user.id)

    userVotedTierListIds = userVotes?.map(v => v.tier_list_id) || []
  }

  // --- Amazon Ads Logic Start ---
  const amazonAds = [
      { isAmazonBookAd: true },
      { isAmazonFurusatoAd: true },
      { isAmazonRankingAd: true },
      { isAmazonTimesaleAd: true }
  ];

  const insertAdsRandomly = (list: any[]) => {
      if (list.length === 0) return;

      const count = list.length;
      let adsToInsertCount = 0;

      if (count < 8) {
          adsToInsertCount = 1;
      } else if (count < 12) {
          adsToInsertCount = 2;
      } else if (count < 16) {
          adsToInsertCount = 3;
      } else {
          adsToInsertCount = 4;
      }

      const shuffledAds = [...amazonAds].sort(() => 0.5 - Math.random());
      const selectedAds = shuffledAds.slice(0, adsToInsertCount);

      selectedAds.forEach(ad => {
          const randomIndex = Math.floor(Math.random() * (list.length + 1));
          list.splice(randomIndex, 0, ad);
      });
  };

  // Only insert ads when not in section view (pagination mode)
  if (!section) {
    if (tierListResults.length > 0) {
        insertAdsRandomly(tierListResults);
    }

    if (itemResults.length > 0) {
        insertAdsRandomly(itemResults);
    }
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
  // --- Amazon Ads Logic End ---

  const hasAnyResults = tierListResults.length > 0 || itemResults.length > 0 || tagResults.length > 0

  // Build base URL for pagination
  const buildBaseUrl = () => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (tagQuery) params.set('tag', tagQuery)
    if (section) params.set('section', section)
    return `/search?${params.toString()}`
  }

  // Build section URL
  const buildSectionUrl = (sectionName: string) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (tagQuery) params.set('tag', tagQuery)
    params.set('section', sectionName)
    const url = `/search?${params.toString()}`
    console.log(`[buildSectionUrl] Built URL for ${sectionName}: ${url}`)
    return url
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl">
      <HomeWrapper uniqueKey={query || tagQuery || section || 'search'}>

      {/* Header - Show back button if section is specified or tag query exists */}
      {section && (
        <div className="mb-4">
          <Link
            href={`/search?${query ? `q=${encodeURIComponent(query)}` : tagQuery ? `tag=${encodeURIComponent(tagQuery)}` : ''}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" />
            検索結果に戻る
          </Link>
        </div>
      )}

      {tagQuery && !section && (
        <div className="mb-4">
          <BackButton />
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8">
        {title}
      </h1>

      {hasAnyResults ? (
        <div className="space-y-12">

            {/* 1. Tier Lists Results */}
            {tierListResults.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4 border-b pb-2">
                      <h2 className="text-2xl font-bold">ティアリスト</h2>
                      {(() => {
                        const showMoreLink = !section && tierListsTotalCount > 20
                        console.log(`[TierLists - More Link] section: ${section}, totalCount: ${tierListsTotalCount}, limit: 20, showMoreLink: ${showMoreLink}`)
                        return showMoreLink && (
                          <Link
                            href={buildSectionUrl('tierlists')}
                            className="text-sm text-primary hover:underline"
                          >
                            もっと見る &rarr;
                          </Link>
                        )
                      })()}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {tierListResults.map((list, index) => {
                            const ad = renderAmazonAd(list, `tier-${index}`);
                            if (ad) return ad;
                            const userHasVoted = userVotedTierListIds.includes(list.id);
                            return <TierListCard key={list.id} list={list} isAdmin={isAdmin} currentUserId={user?.id} userHasVoted={userHasVoted} />
                        })}
                    </div>
                </section>
            )}

            {/* 2. Items Results */}
            {itemResults.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4 border-b pb-2">
                      <h2 className="text-2xl font-bold">アイテム</h2>
                      {(() => {
                        const showMoreLink = !section && itemsTotalCount > 10
                        console.log(`[Items - More Link] section: ${section}, totalCount: ${itemsTotalCount}, limit: 10, showMoreLink: ${showMoreLink}`)
                        return showMoreLink && (
                          <Link
                            href={buildSectionUrl('items')}
                            className="text-sm text-primary hover:underline"
                          >
                            もっと見る &rarr;
                          </Link>
                        )
                      })()}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {itemResults.map((item, idx) => {
                            const ad = renderAmazonAd(item, `item-${idx}`, true);
                            if (ad) return ad;
                            return (
                            <Link
                                key={`${item.name}-${idx}`}
                                href={`/items/${encodeURIComponent(item.name)}`}
                                className="group block bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="aspect-square relative bg-secondary/20">
                                    {item.image_url ? (
                                        <Image
                                            src={item.image_url}
                                            alt={item.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <div className="font-bold truncate text-sm">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">{item.total_votes} 票</div>
                                </div>
                            </Link>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* 3. Tags Results */}
            {tagResults.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4 border-b pb-2">
                      <h2 className="text-2xl font-bold">タグ</h2>
                      {(() => {
                        const showMoreLink = !section && tagsTotalCount > 10
                        console.log(`[Tags - More Link] section: ${section}, totalCount: ${tagsTotalCount}, limit: 10, showMoreLink: ${showMoreLink}`)
                        return showMoreLink && (
                          <Link
                            href={buildSectionUrl('tags')}
                            className="text-sm text-primary hover:underline"
                          >
                            もっと見る &rarr;
                          </Link>
                        )
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {tagResults.map((tag, idx) => (
                            <Link
                                key={`${tag.name}-${idx}`}
                                href={`/search?tag=${encodeURIComponent(tag.name)}`}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 border border-indigo-100 transition-colors dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800"
                            >
                                <Tag size={16} />
                                <span className="font-bold">{tag.name}</span>
                                <span className="text-xs opacity-70">({tag.count_lists})</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
           {(query || tagQuery) ? '見つかりませんでした。別のキーワードやタグで試してみてください。' : '検索ワードを入力してください。'}
        </div>
      )}

      {/* Pagination - Show if section is specified or tag query exists */}
      {(() => {
        const totalPages = Math.ceil(totalCount / limit)
        console.log(`[Pagination Debug] section: ${section}, tagQuery: ${tagQuery}, totalCount: ${totalCount}, limit: ${limit}, totalPages: ${totalPages}, page: ${page}`)
        return (section || tagQuery) && totalCount > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl={buildBaseUrl()}
          />
        )
      })()}

      </HomeWrapper>
    </div>
  )
}
