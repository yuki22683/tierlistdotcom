import { createClient } from '@/utils/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import HomeWrapper from '@/components/HomeWrapper'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const supabase = await createClient()

  const { data: rankings, error } = await supabase
    .rpc('get_user_rankings', { limit_count: 100 })

  if (error) {
    console.error('Error fetching rankings:', error)
  }

  const rankingList = rankings || []

  return (
    <main className="container mx-auto py-10 px-4 max-w-4xl">
      <HomeWrapper uniqueKey="ranking">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3 mb-2">
          <span className="text-yellow-500">👑</span> 
          ランキング
        </h1>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left border-b">
                <th className="p-4 w-20 text-center font-bold text-muted-foreground">#</th>
                <th className="p-4 font-bold text-muted-foreground">ユーザー</th>
                <th className="p-4 w-32 text-right font-bold text-muted-foreground">総投票数</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rankingList.map((user: any, index: number) => {
                // Find the index of the first user with the same vote count
                const rank = rankingList.findIndex((u: any) => u.total_votes === user.total_votes) + 1
                
                let rankStyle = "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                if (rank === 1) rankStyle = "bg-yellow-100 text-yellow-700 border-yellow-200"
                if (rank === 2) rankStyle = "bg-gray-200 text-gray-700 border-gray-300"
                if (rank === 3) rankStyle = "bg-orange-100 text-orange-800 border-orange-200"

                return (
                  <tr key={user.user_id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-center">
                      <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full font-bold text-sm ${rankStyle}`}>
                        {rank}
                      </div>
                    </td>
                    <td className="p-4">
                      <Link href={`/users/${user.user_id}/tier-lists`} className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 border border-border">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.full_name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold">
                              {user.full_name?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        <span className="font-medium truncate max-w-[200px] sm:max-w-xs">
                          {user.full_name || '匿名ユーザー'}
                        </span>
                      </Link>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-lg">
                      {user.total_votes.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
              {rankingList.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-muted-foreground">
                    ランキングデータがありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </HomeWrapper>
    </main>
  )
}
