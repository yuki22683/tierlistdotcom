'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTierList } from '@/app/actions/tierList'
import { format } from 'date-fns'
import { formatNumber } from '@/utils/formatNumber'

interface TierListCardProps {
  list: any
  isAdmin: boolean
  currentUserId?: string
  userHasVoted?: boolean
}

export default function TierListCard({ list, isAdmin, currentUserId, userHasVoted = false }: TierListCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  const previewImage = list.thumbnail_url || list.image_url || list.items?.find((i: any) => i.image_url)?.image_url || '/logo.png'
  const user = list.users || {
      full_name: list.user_full_name,
      avatar_url: list.user_avatar_url
  }

  const isOwner = currentUserId && list.user_id === currentUserId
  const canDelete = isAdmin || isOwner

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('本当にこのティアリストを削除しますか？\nこの操作は取り消せません。')) {
      return
    }

    setIsDeleting(true)
    const result = await deleteTierList(list.id)

    if (result.error) {
      alert('削除に失敗しました: ' + result.error)
      setIsDeleting(false)
    } else {
      // 削除成功時はカードを即座に非表示にする
      setIsDeleted(true)
      setIsDeleting(false)
    }
  }

  // 削除完了後はカードを非表示
  if (isDeleted) {
    return null
  }

  if (isDeleting) {
    return (
      <div className="flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm p-4 items-center justify-center opacity-50 min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="mt-2 text-sm text-gray-500">Deleting...</span>
      </div>
    )
  }

  return (
    <Link 
      href={`/tier-lists/${list.id}`}
      className="group flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all relative"
    >
      {canDelete && (
        <button
          onClick={handleDelete}
          data-no-loading="true"
          className="absolute top-2 left-2 z-10 bg-red-600 text-white p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-md"
          title="削除"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      )}

      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden flex items-center justify-center">
        {previewImage ? (
          <img src={previewImage} alt={list.title} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900">
              <span className="text-4xl">📋</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            {formatNumber(list.vote_count ?? 0)} 票
          </div>
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            {formatNumber(list.view_count ?? 0)} 閲覧
          </div>
          {list.allow_voting && (
            <div className={`text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg ${userHasVoted ? 'bg-blue-600' : 'bg-green-500'}`}>
              {userHasVoted ? '✅投票済' : '投票受付中'}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-2 sm:p-4 flex flex-col flex-1">
        <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">{list.title}</h3>
        
        <div className="mt-auto flex flex-col gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden flex-shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-500 text-[8px] sm:text-xs font-bold">
                  {user?.full_name?.[0] || '?'}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 truncate">
              <span
                className="hover:underline hover:text-indigo-600 transition-colors cursor-pointer truncate max-w-[60px] sm:max-w-none"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  router.push(`/users/${list.user_id}/tier-lists`)
                }}
              >
                {user?.full_name || '匿名'}
              </span>
              <span>•</span>
              <span>{format(new Date(list.created_at), 'yyyy/MM/dd')}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}