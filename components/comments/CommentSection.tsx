'use client'

import { useState, useEffect } from 'react'
import { CommentWithProfile } from '@/types/comments'
import CommentItem from './CommentItem'
import { addComment } from '@/app/actions/comments'
import { createClient } from '@/utils/supabase/client'

interface CommentSectionProps {
  initialComments: CommentWithProfile[]
  currentUserId?: string
  tierListId?: string
  tierListOwnerId?: string
  itemName?: string
  isAdmin?: boolean
}

export default function CommentSection({
  initialComments,
  currentUserId,
  tierListId,
  tierListOwnerId,
  itemName,
  isAdmin
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'popular'>('newest')
  const [isBanned, setIsBanned] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkBanStatus = async () => {
      if (!currentUserId) return
      const { data } = await supabase
        .from('users')
        .select('is_banned')
        .eq('id', currentUserId)
        .single()
      
      if (data?.is_banned) {
        setIsBanned(true)
      }
    }
    checkBanStatus()
  }, [currentUserId])

  // Sync state with props when server revalidates data
  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  // Let's use derived state for sorting.
  const sortedComments = [...comments].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    } else {
      // Sort by Like count (descending)
      if (b.like_count !== a.like_count) {
          return b.like_count - a.like_count
      }
      // If Likes are equal, sort by Dislike count (ascending)
      return (a.dislike_count || 0) - (b.dislike_count || 0)
    }
  })

  const rootComments = sortedComments.filter(c => c.parent_id === null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('content', newComment)
      if (tierListId) formData.append('tierListId', tierListId)
      if (itemName) formData.append('itemName', itemName)

      const result = await addComment(null, formData)
      if (result?.error) {
        alert(result.error)
        return
      }
      setNewComment('')
    } catch (error) {
      console.error('Failed to submit comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span>💬</span>
        <span>コメント</span>
        <span className="text-sm font-normal text-gray-500 ml-2">({initialComments.length})</span>
      </h3>

      {/* Input Area */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
             <div className="flex-grow">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={"コメントを追加...\n違法な投稿は警察に通報します。"}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px] dark:bg-zinc-800 dark:border-zinc-700"
                />
             </div>
             <button
                type="submit"
                disabled={!newComment.trim() || isBanned || isSubmitting}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md font-bold hover:bg-indigo-700 transition disabled:opacity-50 h-fit disabled:cursor-not-allowed w-full sm:w-auto"
             >
                {isSubmitting ? '投稿中...' : isBanned ? '投稿禁止' : '投稿'}
             </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg text-center text-gray-500 border border-gray-200 dark:border-zinc-700">
           コメントを投稿するには<span className="font-bold">ログイン</span>が必要です。
        </div>
      )}

      {/* Filter / Sort */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200 dark:border-zinc-800 pb-2">
        <button
            onClick={() => setSortOrder('newest')}
            className={`pb-2 text-sm font-medium transition border-b-2 ${sortOrder === 'newest' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
            新しい順
        </button>
        <button
            onClick={() => setSortOrder('popular')}
            className={`pb-2 text-sm font-medium transition border-b-2 ${sortOrder === 'popular' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
            人気順
        </button>
      </div>

      {/* Comment List */}
      <div className="space-y-2">
        {rootComments.length > 0 ? (
            rootComments.map(comment => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    replies={sortedComments.filter(c => c.parent_id === comment.id)}
                    allComments={sortedComments}
                    currentUserId={currentUserId}
                    tierListId={tierListId}
                    itemName={itemName}
                    isAdmin={isAdmin}
                    isBanned={isBanned}
                    isTierListOwner={currentUserId && tierListOwnerId ? currentUserId === tierListOwnerId : false}
                />
            ))
        ) : (
            <p className="text-gray-500 text-center py-8">まだコメントはありません。</p>
        )}
      </div>
    </div>
  )
}
