import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import QuizPlayClient from './client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'タイトル当てクイズ | ティアリスト.com',
  description: 'ティアリストのタイトルを当てるクイズゲーム！',
  robots: {
    index: false,
    follow: true,
  }
}

interface Props {
  searchParams: Promise<{
    tag?: string
    all?: string
  }>
}

export default async function QuizPlayPage(props: Props) {
  const searchParams = await props.searchParams
  const tag = searchParams.tag
  const isAllGenres = searchParams.all === 'true'

  // Validate query parameters
  if (!tag && !isAllGenres) {
    redirect('/quiz/select-genre')
  }

  const supabase = await createClient()

  // Fetch initial random tier list
  let tierList
  let totalCount = 0

  if (tag) {
    // Check if tag has any tier lists
    const { data: count } = await supabase.rpc('get_tier_list_count_by_tag', { tag_name: tag })
    totalCount = Number(count) || 0
    if (!totalCount) {
      redirect('/quiz/select-genre')
    }

    const { data } = await supabase.rpc('get_random_tier_list_by_tag', {
      tag_name: tag,
      excluded_ids: []
    })
    tierList = data?.[0]
  } else {
    const { data: count } = await supabase.rpc('get_total_tier_list_count')
    totalCount = Number(count) || 0

    const { data } = await supabase.rpc('get_random_tier_list', {
      excluded_ids: []
    })
    tierList = data?.[0]
  }

  if (!tierList) {
    return (
      <main className="container mx-auto pb-10 pt-4 px-4 max-w-5xl">
        <div className="text-center py-20">
          <p className="text-xl mb-4">問題が見つかりませんでした</p>
          <a href="/quiz/select-genre" className="text-indigo-600 hover:underline">
            ジャンル選択に戻る
          </a>
        </div>
      </main>
    )
  }

  // Fetch tiers
  const { data: tiers } = await supabase
    .from('tiers')
    .select('*')
    .eq('tier_list_id', tierList.id)
    .order('order', { ascending: true })

  // Fetch items
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('tier_list_id', tierList.id)

  // Fetch all vote items for results
  const { data: allVoteItems } = await supabase
    .from('vote_items')
    .select('*, votes!inner(tier_list_id)')
    .eq('votes.tier_list_id', tierList.id)

  // Fetch tier list creator info and tags
  const { data: tierListWithDetails } = await supabase
    .from('tier_lists')
    .select('*, users(full_name, avatar_url), tier_list_tags(tags(name))')
    .eq('id', tierList.id)
    .single()

  // Get current user info
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  let isBanned = false

  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin, is_banned')
      .eq('id', user.id)
      .single()
    isAdmin = !!userProfile?.is_admin
    isBanned = !!userProfile?.is_banned
  }

  // Fetch comments
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
    .eq('tier_list_id', tierList.id)
    .order('created_at', { ascending: false })

  return (
    <QuizPlayClient
      initialTierList={tierListWithDetails || tierList}
      tiers={tiers || []}
      items={items || []}
      allVoteItems={allVoteItems || []}
      currentUser={user}
      initialComments={comments || []}
      isAdmin={isAdmin}
      isBanned={isBanned}
      tag={tag}
      isAllGenres={isAllGenres}
      totalCount={totalCount}
    />
  )
}
