import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CreateTierListButton from '@/components/CreateTierListButton'
import TierListCard from '@/components/TierListCard'

interface Props {
  params: Promise<{ categoryId: string }>
  searchParams: Promise<{ sort?: string; page?: string }>
}

export default async function CategoryDetailPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const categoryId = params.categoryId
  const sort = searchParams.sort === 'new' ? 'new' : 'popular'
  const page = parseInt(searchParams.page || '1')
  const limit = 12
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createClient()

  // Fetch Category Info
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single()

  if (categoryError || !category) {
    notFound()
  }

  // Fetch Tier Lists
  const { data: rawTierLists, error: listError } = await supabase
    .rpc('search_tier_lists', {
        category_id_filter: categoryId,
        sort_by: sort,
        limit_count: limit,
        offset_val: from
    })

  if (listError) {
    console.error('Error fetching category tier lists:', listError)
  }

  // Get count separately
  const { count } = await supabase
    .from('tier_lists')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  const tierLists = rawTierLists ? [...rawTierLists] : []

  const totalPages = count ? Math.ceil(count / limit) : 0

  // Amazon Ads Insertion
  if (tierLists.length > 0) {
      const ads = [
          { isAmazonBookAd: true },
          { isAmazonFurusatoAd: true },
          { isAmazonRankingAd: true },
          { isAmazonTimesaleAd: true }
      ];
      ads.forEach(ad => {
          const idx = Math.floor(Math.random() * (tierLists.length + 1));
          tierLists.splice(idx, 0, ad);
      });
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

  return (
    <main className="container mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
        </div>
        <CreateTierListButton 
          isLoggedIn={!!user} 
          isBanned={isBanned} 
          dailyLimitReached={dailyLimitReached} 
          categoryId={categoryId}
        />
      </div>

      {/* Toolbar: Sort & Filter */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div className="flex gap-2">
          <Link 
            href={`/categories/${categoryId}?sort=popular`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${sort === 'popular' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            人気順
          </Link>
          <Link 
             href={`/categories/${categoryId}?sort=new`}
             className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${sort === 'new' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            新しい順
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {tierLists.map((list: any, index: number) => {
          const ad = renderAmazonAd(list, `cat-${index}`);
          if (ad) return ad;
          const userHasVoted = userVotedTierListIds.includes(list.id);
          return <TierListCard key={list.id} list={list} isAdmin={isAdmin} currentUserId={user?.id} userHasVoted={userHasVoted} />
        })}
        
        {(!tierLists || tierLists.length === 0) && (
            <div className="col-span-full text-center py-20 text-muted-foreground">
                このカテゴリーにはまだティアリストがありません。
            </div>
        )}
      </div>

       {/* Pagination */}
       {totalPages > 1 && (
           <div className="flex justify-center mt-12 gap-2">
              {page > 1 && (
                 <Link href={`/categories/${categoryId}?sort=${sort}&page=${page - 1}`} className="px-4 py-2 border rounded-md hover:bg-accent transition-colors">前へ</Link>
              )}
              {page < totalPages && (
                 <Link href={`/categories/${categoryId}?sort=${sort}&page=${page + 1}`} className="px-4 py-2 border rounded-md hover:bg-accent transition-colors">次へ</Link>
              )}
           </div>
       )}
    </main>
  )
}
