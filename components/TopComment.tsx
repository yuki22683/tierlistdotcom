'use client'

import { useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronUp } from 'lucide-react'

type TopCommentProps = {
  comment: any // Using any to match the loose type from page.tsx, or define specific interface
}

export default function TopComment({ comment }: TopCommentProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (!comment) return null

  const isEdited = comment.updated_at && comment.created_at && new Date(comment.updated_at).getTime() > new Date(comment.created_at).getTime()

  return (
    <div className="mb-16">
      <div className="bg-transparent p-4 rounded-xl border border-amber-200 dark:border-amber-900 w-full shadow-sm">
        {/* Header with Toggle */}
        <div 
            className="flex items-center justify-between mb-3 cursor-pointer select-none"
            onClick={() => setIsOpen(!isOpen)}
        >
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-bold text-lg">
                <span>🏆</span>
                <span>トップコメント</span>
            </div>
            <button 
                className="text-amber-600 dark:text-amber-500 p-1 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-full transition-colors"
                aria-label={isOpen ? "トップコメントを折りたたむ" : "トップコメントを展開する"}
            >
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
        </div>
        
        {isOpen && (
            <div className="animate-in slide-in-from-top-2 duration-200 fade-in">
                {/* Comment Content */}
                <div className="text-base md:text-lg text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed px-1">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({ node, ...props }) => (
                                <a 
                                    {...props} 
                                    target="_blank" 
                                    rel="nofollow noopener noreferrer" 
                                    className="text-amber-600 dark:text-amber-500 hover:underline break-all"
                                />
                            ),
                            p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                            ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
                            ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
                            blockquote: ({ node, ...props }) => (
                                <blockquote {...props} className="border-l-4 border-amber-200 pl-4 italic text-gray-600 dark:text-gray-400 mb-2" />
                            ),
                            code: ({ node, ...props }) => (
                                <code {...props} className="bg-amber-100/50 dark:bg-amber-900/30 px-1 rounded font-mono text-xs" />
                            ),
                        }}
                    >
                        {comment.content}
                    </ReactMarkdown>
                </div>

                {/* Footer: Author & Link */}
                <div className="flex items-center justify-between border-t border-amber-200/50 dark:border-amber-900/50 pt-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 relative rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                            {comment.users?.avatar_url ? (
                                <Image
                                    src={comment.users.avatar_url}
                                    alt={comment.users.full_name || 'User'}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <span className="flex items-center justify-center w-full h-full text-gray-500 text-xs font-bold">
                                    {comment.users?.full_name?.[0] || 'U'}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {comment.users?.full_name || '名無し'}
                            {isEdited && <span className="text-xs text-gray-400 ml-2">（編集済み）</span>}
                        </span>
                    </div>

                    {/* Link */}
                    <a href="#comments" className="text-sm text-amber-600/70 hover:text-amber-600 underline flex-shrink-0 ml-4">
                        コメント欄で見る
                    </a>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}
