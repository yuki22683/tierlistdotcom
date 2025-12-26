import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import TierListClientPage from './client'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: tierList, error } = await supabase
    .from('tier_lists')
    .select('title, description, image_url, tier_list_tags(tags(name))')
    .eq('id', id)
    .single()

  if (error || !tierList) {
    // Return default metadata instead of "not found" message
    // The page itself will handle the actual not found state
    return {
      title: 'ティアリスト.com - みんなで決める、最強のランキング',
      description: 'アニメ、ゲーム、エンタメなど、あらゆるジャンルのティアリストを誰でも作成・投票可能！',
    }
  }

  // Extract tag names
  const tags = tierList.tier_list_tags?.map((t: any) => t.tags?.name).filter(Boolean) || []
  const tagString = tags.length > 0 ? ` [タグ: ${tags.join(', ')}]` : ''
  const keywords = tags.length > 0 ? tags.join(', ') : undefined

  const baseDescription = tierList.description || `${tierList.title}のティアリスト（ランキング）です。みんなの投票結果を確認したり、自分でも投票に参加できます。`
  const descriptionWithTags = `${baseDescription}${tagString}`
  
  // Use logo.png as fallback for OG image
  const ogImage = tierList.image_url || "/logo.png"

  return {
    title: `${tierList.title}${tags.length > 0 ? ` (${tags[0]})` : ''} | ティアリスト.com`,
    description: descriptionWithTags,
    keywords,
    openGraph: {
      title: `${tierList.title} | ティアリスト.com`,
      description: descriptionWithTags,
      type: 'article',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tierList.title} | ティアリスト.com`,
      description: descriptionWithTags,
      images: [ogImage],
    },
  }
}

export default async function TierListDetailPage(props: Props) {
  const params = await props.params;
  const tierListId = params.id
  const supabase = await createClient()

  // 1. Fetch Tier List Info
  const { data: tierList, error: listError } = await supabase
    .from('tier_lists')
    .select('*, users(full_name, avatar_url), tier_list_tags(tags(name))')
    .eq('id', tierListId)
    .single()

  if (listError || !tierList) {
    notFound()
  }

  // Increment view count
  await supabase
    .from('tier_lists')
    .update({ view_count: (tierList.view_count || 0) + 1 })
    .eq('id', tierListId)

  // Prepare structured data (JSON-LD) for SEO
  const tags = tierList.tier_list_tags?.map((t: any) => t.tags?.name).filter(Boolean) || []
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: tierList.title,
    description: tierList.description || `${tierList.title}のティアリストです。`,
    author: {
      '@type': 'Person',
      name: tierList.users?.full_name || 'Unknown'
    },
    datePublished: tierList.created_at,
    dateModified: tierList.updated_at || tierList.created_at,
    keywords: tags.join(', '),
    articleSection: tags.length > 0 ? tags[0] : undefined,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/VoteAction',
        userInteractionCount: tierList.vote_count || 0
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: tierList.view_count || 0
      }
    ]
  }

  // 2. Fetch Tiers
  const { data: tiers, error: tiersError } = await supabase
    .from('tiers')
    .select('*')
    .eq('tier_list_id', tierListId)
    .order('order', { ascending: true })

  if (tiersError) {
    console.error(tiersError)
    // Handle error gracefully or throw
  }

  // 3. Fetch Items
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('tier_list_id', tierListId)

  if (itemsError) {
    console.error(itemsError)
  }

  // 4. Fetch User's previous vote (if any) to resume or show "You voted"
  const { data: { user } } = await supabase.auth.getUser()
  let userVote = null
  let userVoteItems = null
  let isAdmin = false
  let isBanned = false
  let userVotedTierListIds: string[] = []

  if (user) {
      const { data: vote } = await supabase
        .from('votes')
        .select('id')
        .eq('tier_list_id', tierListId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (vote) {
          userVote = vote
          const { data: vItems } = await supabase
            .from('vote_items')
            .select('*')
            .eq('vote_id', vote.id)
          userVoteItems = vItems
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('is_admin, is_banned')
        .eq('id', user.id)
        .single()
      isAdmin = !!userProfile?.is_admin
      isBanned = !!userProfile?.is_banned

      // Get tier list IDs that the user has voted on
      const { data: userVotes } = await supabase
        .from('votes')
        .select('tier_list_id')
        .eq('user_id', user.id)

      userVotedTierListIds = userVotes?.map(v => v.tier_list_id) || []
  }
  
  // 5. Fetch ALL votes for results aggregation
  const { data: allVoteItems } = await supabase
     .from('vote_items')
     .select('*, votes!inner(tier_list_id)') 
     .eq('votes.tier_list_id', tierListId)
  
  // 6. Fetch Comments
  const { data: comments, error: commentsError } = await supabase
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
    .eq('tier_list_id', tierListId)
    .order('created_at', { ascending: false })

  if (commentsError) {
    console.error('Error fetching comments:', commentsError)
  }

  // 7. Fetch Related Tier Lists
  const { data: relatedTierLists, error: relatedError } = await supabase
    .rpc('get_related_tier_lists', { p_tier_list_id: tierListId, p_limit: 5 })

  if (relatedError) {
      console.error('Error fetching related tier lists:', JSON.stringify(relatedError, null, 2))
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <TierListClientPage
          tierList={tierList}
          tiers={tiers || []}
          items={items || []}
          userVote={userVote}
          userVoteItems={userVoteItems}
          allVoteItems={allVoteItems || []}
          currentUser={user}
          initialComments={comments || []}
          relatedTierLists={relatedTierLists || []}
          isAdmin={isAdmin}
          isBanned={isBanned}
          userVotedTierListIds={userVotedTierListIds}
      />
    </>
  )
}
