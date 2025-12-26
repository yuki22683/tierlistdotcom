import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Pagination from '@/components/Pagination'
import AllGenresButton from '@/components/AllGenresButton'
import HomeWrapper from '@/components/HomeWrapper'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'クイズ - ジャンル選択 | ティアリスト.com',
  description: 'タイトル当てクイズで遊ぼう！好きなジャンルを選んでティアリストのタイトルを当てるゲームです。',
  robots: {
    index: false,
    follow: true,
  }
}

interface Props {
  searchParams: Promise<{
    page?: string
  }>
}

export default async function SelectGenrePage(props: Props) {
  const searchParams = await props.searchParams
  const page = parseInt(searchParams.page || '1', 10)
  const limit = 100
  const offset = (page - 1) * limit

  const supabase = await createClient()

  // Fetch popular tags
  const { data: tags } = await supabase.rpc('get_popular_tags', {
    limit_count: limit,
    offset_val: offset
  })

  // Fetch total count
  const { data: totalCountData } = await supabase.rpc('get_popular_tags_count')
  const totalCount = Number(totalCountData) || 0
  const totalPages = Math.ceil(totalCount / limit)

  return (
    <main className="container mx-auto pb-10 pt-4 px-4 max-w-5xl">
      <HomeWrapper uniqueKey="quiz-select-genre">
        {/* Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center text-indigo-600 hover:underline mb-6"
        >
          ← ホームに戻る
        </Link>

        <h1 className="text-3xl font-bold mb-6 text-center">ジャンル選択</h1>
        <p className="text-center text-muted-foreground mb-8">
          クイズで出題するジャンルを選んでください
        </p>

        {/* Tag Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
          {tags && tags.length > 0 ? (
            tags.map((tag: any) => (
              <Link
                key={tag.id}
                href={`/quiz/play?tag=${encodeURIComponent(tag.name)}`}
                className="flex flex-col p-4 bg-card border rounded-lg hover:bg-accent/50 hover:border-primary/50 transition-colors"
              >
                <span className="font-bold text-base truncate mb-1">#{tag.name}</span>
                <span className="text-xs text-muted-foreground">{tag.total_votes} 票</span>
                <span className="text-xs text-muted-foreground">{tag.count_lists} リスト</span>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              タグがありません
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/quiz/select-genre?"
          />
        )}

        {/* All Genres Button */}
        <AllGenresButton />
      </HomeWrapper>
    </main>
  )
}
