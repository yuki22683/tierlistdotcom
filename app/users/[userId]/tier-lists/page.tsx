import { createClient } from '@/utils/supabase/server'
import TierListCard from '@/components/TierListCard'
import { notFound } from 'next/navigation'
import HomeWrapper from '@/components/HomeWrapper'
import Pagination from '@/components/Pagination'
import BackButton from '@/components/BackButton'

interface Props {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function UserTierListsPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const userId = params.userId
  const page = parseInt(searchParams.page || '1', 10)
  const limit = 20
  const offset = (page - 1) * limit
  const supabase = await createClient()

  // Fetch User Info
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single()

  if (userError || !userProfile) {
    notFound()
  }

  // Fetch Total Count of User's Tier Lists
  const { count: totalCount } = await supabase
    .from('tier_lists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Fetch User's Tier Lists with Pagination
  const { data: tierLists, error: listError } = await supabase
    .rpc('search_tier_lists', {
        user_id_filter: userId,
        sort_by: 'new',
        limit_count: limit,
        offset_val: offset
    })

  if (listError) {
    console.error('Error fetching user tier lists:', listError)
  }

  const totalVotes = tierLists?.reduce((sum, list) => sum + (list.vote_count || 0), 0) || 0

  // Check Current User Admin Status
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  let userVotedTierListIds: string[] = []
  if (user) {
    const { data: currentUserProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    isAdmin = !!currentUserProfile?.is_admin

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

  if (tierLists && tierLists.length > 0) {
      insertAdsRandomly(tierLists);
  }

  const renderAmazonAd = (item: any, keyPrefix: string) => {
      const cardClass = "group flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all relative h-full w-full aspect-video";

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

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <HomeWrapper uniqueKey={userId}>
      <div className="mb-8">
        <BackButton />

        <div className="flex items-center gap-4">
          <img 
            src={userProfile.avatar_url || '/placeholder-avatar.png'} 
            alt={userProfile.full_name || 'User'} 
            className="w-16 h-16 rounded-full border border-gray-200 object-cover"
          />
          <div>
            <div className="flex items-baseline gap-3">
                <h1 className="text-2xl font-bold">{userProfile.full_name || 'Unknown User'}</h1>
                <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    合計 {totalVotes} 票獲得
                </span>
            </div>
            <p className="text-muted-foreground text-sm">作成したティアリスト一覧</p>
          </div>
        </div>
      </div>

      {tierLists && tierLists.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {tierLists.map((list: any, index: number) => {
              const ad = renderAmazonAd(list, `user-list-${index}`);
              if (ad) return ad;
              const userHasVoted = userVotedTierListIds.includes(list.id);
              return <TierListCard key={list.id} list={list} isAdmin={isAdmin} currentUserId={user?.id} userHasVoted={userHasVoted} />
            })}
          </div>
          {totalCount && totalCount > 0 && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(totalCount / limit)}
              baseUrl={`/users/${userId}/tier-lists?`}
            />
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-dashed border-gray-300 dark:border-zinc-700">
          <p className="text-gray-500">作成したティアリストはありません。</p>
        </div>
      )}
      </HomeWrapper>
    </div>
  )
}
