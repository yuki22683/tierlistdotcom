'use client'

import { useState } from 'react'
import { CommentWithProfile } from '@/types/comments'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  toggleLike,
  toggleDislike,
  addComment,
  deleteComment,
  reportComment
} from '@/app/actions/comments'
import Image from 'next/image'

/* ===============================
   バッド率 → 背景一致率
   ・5票未満は無効
   ・5票以上は dislike / total
================================ */
function calcFade(likes: number, dislikes: number) {
  const total = likes + dislikes
  if (total < 5) return 0
  return dislikes / total // 0.0 ～ 1.0
}

interface CommentItemProps {
  comment: CommentWithProfile
  replies: CommentWithProfile[]
  currentUserId?: string
  tierListId?: string
  itemName?: string
  allComments: CommentWithProfile[]
  isAdmin?: boolean
  isBanned?: boolean
  isTierListOwner?: boolean
}

export default function CommentItem({
  comment,
  replies,
  currentUserId,
  tierListId,
  itemName,
  allComments,
  isAdmin,
  isBanned,
  isTierListOwner
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isLikePending, setIsLikePending] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const isLiked = comment.likes?.some(l => l.user_id === currentUserId)
  const isDisliked = comment.dislikes?.some(d => d.user_id === currentUserId)

  /* ===============================
     フェード量（核心）
  ================================ */
  let fade = calcFade(
    comment.like_count ?? 0,
    comment.dislike_count ?? 0
  )

  // 投稿者本人・管理人は不可視化されない
  if (currentUserId === comment.user_id || isAdmin) {
    fade = 0
  }

  const handleLike = async () => {
    if (!currentUserId) return alert('ログインが必要です')
    setIsLikePending(true)
    await toggleLike(comment.id, window.location.pathname)
    setIsLikePending(false)
  }

  const handleDislike = async () => {
    if (!currentUserId) return alert('ログインが必要です')
    setIsLikePending(true)
    await toggleDislike(comment.id, window.location.pathname)
    setIsLikePending(false)
  }

  const handleDelete = async () => {
    if (!confirm('本当に削除しますか？')) return
    await deleteComment(comment.id, window.location.pathname)
  }

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportReason.trim()) return

    const result = await reportComment(comment.id, reportReason)
    if (result.error) {
      alert(result.error)
    } else {
      alert('通報しました。ご協力ありがとうございます。')
      setIsReporting(false)
      setReportReason('')
    }
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return

    const formData = new FormData()
    formData.append('content', replyContent)
    if (tierListId) formData.append('tierListId', tierListId)
    if (itemName) formData.append('itemName', itemName)
    formData.append('parentId', comment.id)

    const result = await addComment(null, formData)
    if (result?.error) {
      alert(result.error)
      return
    }

    setIsReplying(false)
    setReplyContent('')
    setShowReplies(true)
  }

  return (
    <div className="flex gap-3 py-4">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative">
          {comment.users?.avatar_url ? (
            <Image
              src={comment.users.avatar_url}
              alt={comment.users.full_name || 'User'}
              fill
              className="object-cover"
            />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-gray-500 text-sm">
              {comment.users?.full_name?.[0] || 'U'}
            </span>
          )}
        </div>
      </div>

      <div className="flex-grow">
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-sm">
            {comment.users?.full_name || 'Anonymous'}
          </span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
              locale: ja
            })}
          </span>
        </div>

        {/* ===== コメント本文（背景一致率フェード） ===== */}
        <div
          className="text-sm mb-2 whitespace-pre-wrap transition-colors duration-300"
          style={{
            color: `color-mix(
              in srgb,
              var(--comment-text-color) ${(1 - fade) * 100}%,
              var(--comment-bg-color) ${fade * 100}%
            )`
          }}
        >
          {comment.content}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <button
            onClick={handleLike}
            disabled={isLikePending || !currentUserId}
            className={`flex items-center gap-1 hover:bg-gray-100 p-1 rounded transition ${
              isLiked ? 'text-blue-600 font-bold' : ''
            } ${!currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            👍 {comment.like_count}
          </button>

          <button
            onClick={handleDislike}
            disabled={isLikePending || !currentUserId}
            className={`flex items-center gap-1 hover:bg-gray-100 p-1 rounded transition ${
              isDisliked ? 'text-red-600 font-bold' : ''
            } ${!currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            👎 {comment.dislike_count}
          </button>

          <button
            onClick={() => setIsReplying(!isReplying)}
            disabled={!currentUserId || isBanned}
            className="hover:bg-gray-100 p-1 rounded transition disabled:opacity-50"
          >
            返信
          </button>

          <button
            onClick={() => setIsReporting(!isReporting)}
            disabled={!currentUserId || isBanned}
            className="hover:bg-gray-100 p-1 rounded transition disabled:opacity-50"
          >
            通報
          </button>

          {(currentUserId === comment.user_id || isAdmin || isTierListOwner) && (
            <button
              onClick={handleDelete}
              className="hover:bg-red-50 text-red-500 p-1 rounded transition"
            >
              削除
            </button>
          )}
        </div>

        {/* 通報 */}
        {isReporting && (
          <form onSubmit={handleReport} className="mt-3 p-3 rounded bg-red-50">
            <input
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="w-full text-sm px-3 py-1 border rounded"
              placeholder="通報理由を入力"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setIsReporting(false)} className="text-xs">
                キャンセル
              </button>
              <button type="submit" className="text-xs text-red-600">
                送信
              </button>
            </div>
          </form>
        )}

        {/* 返信 */}
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3 flex gap-2">
            <input
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              className="flex-grow border rounded px-3 py-1 text-sm"
              placeholder="返信を入力..."
            />
            <button type="submit" className="text-xs bg-blue-500 text-white px-3 rounded">
              送信
            </button>
          </form>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-sm text-blue-600"
            >
              {showReplies ? '返信を隠す' : `${replies.length}件の返信`}
            </button>

            {showReplies && (
              <div className="pl-4 border-l mt-2">
                {replies.map(reply => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    replies={allComments.filter(c => c.parent_id === reply.id)}
                    allComments={allComments}
                    currentUserId={currentUserId}
                    tierListId={tierListId}
                    itemName={itemName}
                    isAdmin={isAdmin}
                    isBanned={isBanned}
                    isTierListOwner={isTierListOwner}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
