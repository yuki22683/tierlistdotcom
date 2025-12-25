'use client'

import { useState } from 'react'
import { reportTierList } from '@/app/actions/tierList'
import { Flag, X } from 'lucide-react'

interface TierListReportModalProps {
  tierListId: string
  isOpen: boolean
  onClose: () => void
}

export default function TierListReportModal({ tierListId, isOpen, onClose }: TierListReportModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return

    setIsSubmitting(true)
    const result = await reportTierList(tierListId, reason)
    setIsSubmitting(false)

    if (result.error) {
      alert(result.error)
    } else {
      alert('通報しました。ご協力ありがとうございます。')
      setReason('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Flag className="text-red-500" />
          ティアリストを通報
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              理由
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="不適切な内容、スパムなど..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px] dark:bg-zinc-800 dark:border-zinc-700"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
            >
              {isSubmitting ? '送信中...' : '通報する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
