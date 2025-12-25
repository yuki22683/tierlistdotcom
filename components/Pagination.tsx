import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl: string
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  const getUrl = (page: number) => `${baseUrl}&page=${page}`

  if (totalPages <= 0) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-8 mb-28">
      {/* First Page */}
      <Link
        href={getUrl(1)}
        className={`p-2 border rounded-md transition-colors ${
          currentPage === 1 
            ? 'pointer-events-none opacity-50 bg-muted' 
            : 'hover:bg-accent'
        }`}
        aria-disabled={currentPage === 1}
        title="最初のページ"
      >
        <ChevronsLeft size={20} />
      </Link>

      {/* Prev Page */}
      <Link
        href={getUrl(currentPage - 1)}
        className={`flex items-center gap-1 px-3 py-2 border rounded-md transition-colors ${
          currentPage === 1 
            ? 'pointer-events-none opacity-50 bg-muted' 
            : 'hover:bg-accent'
        }`}
        aria-disabled={currentPage === 1}
        title="前のページ"
      >
        <ChevronLeft size={20} />
        <span className="hidden sm:inline">前へ</span>
      </Link>

      {/* Current Page */}
      <div className="flex items-center justify-center min-w-[100px] px-4 font-medium text-sm sm:text-base">
        {currentPage} / {totalPages}
      </div>

      {/* Next Page */}
      <Link
        href={getUrl(currentPage + 1)}
        className={`flex items-center gap-1 px-3 py-2 border rounded-md transition-colors ${
          currentPage >= totalPages 
            ? 'pointer-events-none opacity-50 bg-muted' 
            : 'hover:bg-accent'
        }`}
        aria-disabled={currentPage >= totalPages}
        title="次のページ"
      >
        <span className="hidden sm:inline">次へ</span>
        <ChevronRight size={20} />
      </Link>

      {/* Last Page */}
      <Link
        href={getUrl(totalPages)}
        className={`p-2 border rounded-md transition-colors ${
          currentPage >= totalPages 
            ? 'pointer-events-none opacity-50 bg-muted' 
            : 'hover:bg-accent'
        }`}
        aria-disabled={currentPage >= totalPages}
        title="最後のページ"
      >
        <ChevronsRight size={20} />
      </Link>
    </div>
  )
}
