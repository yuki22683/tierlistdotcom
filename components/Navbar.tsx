'use client'

import Link from 'next/link'
import Image from 'next/image'
import AuthButton from './AuthButton'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ShieldAlert, Crown, HelpCircle, Search, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useLoading } from '@/context/LoadingContext'

interface NavbarProps {
  disableLogout?: boolean
}

export default function Navbar({ disableLogout = false }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { startLoading } = useLoading()

  // Auto-disable logout on quiz play screen
  const isQuizPlayPage = pathname?.startsWith('/quiz/play')
  const shouldDisableLogout = disableLogout || isQuizPlayPage

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        
        if (data?.is_admin) {
          setIsAdmin(true)
        }
      }
    }
    checkAdmin()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    // 即座にUIをブロック
    if (typeof document !== 'undefined') {
      document.body.classList.add('page-loading')
    }
    startLoading()
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
  }

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If already on home page, reload
    if (pathname === '/') {
      e.preventDefault()
      window.location.reload()
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-black text-white backdrop-blur supports-[backdrop-filter]:bg-black/90">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-2 sm:px-4 md:px-8">
        <div className={`flex items-center ${isMobileSearchOpen ? 'hidden sm:flex' : 'flex'}`}>
          <Link className="mr-1 sm:mr-6 flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity" href="/" onClick={handleHomeClick}>
            <Image
              src="/logo.png"
              alt="Logo"
              width={128}
              height={128}
              className="w-8 h-8 rounded-sm object-contain"
              priority
            />
            <span className="font-bold text-lg sm:text-2xl text-white">ティアリスト.com</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center space-x-4">
            <Link 
              href="/ranking"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              ランキング
            </Link>
            <Link 
              href="/usage"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              使い方
            </Link>
          </div>
        </div>
        
        <div className={`flex items-center justify-end space-x-1 sm:space-x-2 flex-1 ml-2 ${isMobileSearchOpen ? 'w-full' : ''}`}>
          {isAdmin && !isMobileSearchOpen && (
            <Link 
              href="/admin/reports"
              className="hidden md:flex items-center gap-1 text-sm font-medium text-rose-500 hover:text-rose-400 mr-4 transition-colors"
            >
              <ShieldAlert size={18} />
              <span>管理画面</span>
            </Link>
          )}

          {/* Mobile Navigation Icons (Left of Search) */}
          {!isMobileSearchOpen && (
            <div className="flex sm:hidden items-center space-x-1">
              <Link 
                href="/ranking"
                className="p-1 text-white/80 hover:text-white transition-colors"
                title="ランキング"
              >
                <Crown size={20} />
              </Link>
              <Link 
                href="/usage"
                className="p-1 text-white/80 hover:text-white transition-colors"
                title="使い方"
              >
                <HelpCircle size={20} />
              </Link>
            </div>
          )}

          {/* Search Section */}
          <div className={`flex items-center gap-1 sm:gap-2 ${isMobileSearchOpen ? 'flex-1' : ''}`}>
            {/* Desktop & Open Mobile Search */}
            <div className={`${isMobileSearchOpen ? 'flex flex-1' : 'hidden sm:block'} max-w-[300px] sm:flex-1`}>
              <form onSubmit={(e) => { handleSearch(e); setIsMobileSearchOpen(false); }} className="relative w-full">
                <input
                  autoFocus={isMobileSearchOpen}
                  type="text"
                  placeholder="検索..."
                  className="h-8 sm:h-9 w-full rounded-md border border-input bg-white px-8 sm:px-3 py-1 text-xs sm:text-sm text-black shadow-sm transition-colors placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 sm:hidden" />
              </form>
            </div>

            {/* Mobile Search Toggle Icons */}
            <button 
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="p-1 text-white/80 hover:text-white transition-colors sm:hidden"
            >
              {isMobileSearchOpen ? <X size={24} /> : <Search size={22} />}
            </button>
          </div>

          {!isMobileSearchOpen && (
            <Suspense fallback={<div className="w-20 h-9 bg-gray-800 rounded animate-pulse" />}>
              <AuthButton disableLogout={shouldDisableLogout} />
            </Suspense>
          )}
        </div>
      </div>
    </nav>
  )
}