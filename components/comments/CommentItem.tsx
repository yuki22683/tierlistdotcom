'use client'

import { useState, useRef, useEffect } from 'react'
import { CommentWithProfile } from '@/types/comments'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  toggleLike,
  toggleDislike,
  addComment,
  deleteComment,
  reportComment,
  updateComment
} from '@/app/actions/comments'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/* ===============================
   バッド率 → 背景一致率
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
  const [isReplySubmitting, setIsReplySubmitting] = useState(false)
  const [isReportSubmitting, setIsReportSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showReadMore, setShowReadMore] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const isLiked = comment.likes?.some(l => l.user_id === currentUserId)
  const isDisliked = comment.dislikes?.some(d => d.user_id === currentUserId)
  const isEdited = comment.updated_at && comment.created_at && new Date(comment.updated_at).getTime() > new Date(comment.created_at).getTime()

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        // Save current state
        const currentClassList = contentRef.current.className
        const wasExpanded = !currentClassList.includes('line-clamp-4')

        // Temporarily add line-clamp to measure if content would overflow in collapsed state
        if (wasExpanded) {
          contentRef.current.classList.add('line-clamp-4')
        }

        // Small delay to ensure layout is calculated
        requestAnimationFrame(() => {
          if (contentRef.current) {
            const hasOverflow = contentRef.current.scrollHeight > contentRef.current.clientHeight

            // Restore original state
            if (wasExpanded) {
              contentRef.current.classList.remove('line-clamp-4')
            }

            setShowReadMore(hasOverflow)
          }
        })
      }
    }
    
    checkOverflow()
    // Re-check on resize for responsiveness
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [comment.content, isEditing])

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
    if (isDeleting) return
    if (!confirm('本当に削除しますか？')) return

    setIsDeleting(true)
    try {
      await deleteComment(comment.id, window.location.pathname)
    } catch (error) {
      console.error('Failed to delete comment:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportReason.trim() || isReportSubmitting) return

    setIsReportSubmitting(true)
    try {
      const result = await reportComment(comment.id, reportReason)
      if (result.error) {
        alert(result.error)
      } else {
        alert('通報しました。ご協力ありがとうございます。')
        setIsReporting(false)
        setReportReason('')
      }
    } catch (error) {
      console.error('Failed to submit report:', error)
    } finally {
      setIsReportSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editContent.trim() || isUpdateSubmitting) return

    setIsUpdateSubmitting(true)
    try {
      const result = await updateComment(comment.id, editContent, window.location.pathname)
      if (result.error) {
        alert(result.error)
      } else {
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to update comment:', error)
    } finally {
      setIsUpdateSubmitting(false)
    }
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || isReplySubmitting) return

    setIsReplySubmitting(true)
    try {
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
    } catch (error) {
      console.error('Failed to submit reply:', error)
    } finally {
      setIsReplySubmitting(false)
    }
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
            {isEdited && <span className="ml-1 text-gray-400">（編集済み）</span>}
          </span>
        </div>

        {/* ===== コメント本文（Markdown対応 & 背景一致率フェード） ===== */}
        {isEditing ? (
          <form onSubmit={handleUpdate} className="mb-2">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full p-2 border rounded text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
              disabled={isUpdateSubmitting}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(comment.content)
                }}
                disabled={isUpdateSubmitting}
                className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isUpdateSubmitting || !editContent.trim()}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdateSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div
              ref={contentRef}
              className={`text-sm mb-1 whitespace-pre-wrap transition-colors duration-300 ${!isExpanded ? 'line-clamp-4' : ''}`}
              style={{
                color: `color-mix(
                  in srgb,
                  var(--comment-text-color) ${(1 - fade) * 100}%,
                  var(--comment-bg-color) ${fade * 100}%
                )`
              }}
            >
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a 
                      {...props} 
                      target="_blank" 
                      rel="nofollow noopener noreferrer" 
                      className="text-blue-500 hover:underline break-all"
                    />
                  ),
                  p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                  ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
                  ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
                  blockquote: ({ node, ...props }) => (
                    <blockquote {...props} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:text-gray-400 mb-2" />
                  ),
                  code: ({ node, ...props }) => (
                    <code {...props} className="bg-gray-100 dark:bg-zinc-800 px-1 rounded font-mono text-xs" />
                  ),
                }}
              >
                {comment.content}
              </ReactMarkdown>
            </div>
            {showReadMore && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-blue-500 hover:underline mb-2 block"
              >
                {isExpanded ? '一部を表示' : '続きを読む'}
              </button>
            )}
          </>
        )}

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

          {currentUserId === comment.user_id && !isBanned && (
            <button
              onClick={() => {
                setIsEditing(!isEditing)
                setEditContent(comment.content)
              }}
              disabled={isEditing}
              className="hover:bg-gray-100 p-1 rounded transition disabled:opacity-50"
            >
              編集
            </button>
          )}

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
              disabled={isDeleting}
              className="hover:bg-red-50 text-red-500 p-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? '削除中...' : '削除'}
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
              disabled={isReportSubmitting}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsReporting(false)}
                disabled={isReportSubmitting}
                className="text-xs disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isReportSubmitting || !reportReason.trim()}
                className="text-xs text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReportSubmitting ? '送信中...' : '送信'}
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
              disabled={isReplySubmitting}
            />
            <button
              type="submit"
              disabled={isReplySubmitting || !replyContent.trim()}
              className="text-xs bg-blue-500 text-white px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReplySubmitting ? '送信中...' : '送信'}
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
