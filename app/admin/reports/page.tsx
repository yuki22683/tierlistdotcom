'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2, CheckCircle, AlertTriangle, ShieldOff, UserX, FileText, ExternalLink } from 'lucide-react'
import { deleteTierList } from '@/app/actions/tierList'

type Report = {
  id: string
  reason: string
  status: 'pending' | 'reviewed' | 'dismissed'
  created_at: string
  comment: {
    id: string
    content: string
    created_at: string
    tier_list_id?: string
    author: {
      id: string
      email: string
      is_banned: boolean
    } | null
  } | null
  tier_list: {
    id: string
    title: string
    description: string
    created_at: string
    author: {
        id: string
        email: string
        is_banned: boolean
    } | null
  } | null
  reporter: {
    email: string
  } | null
}

type BannedUser = {
  id: string
  email: string
  full_name: string
  avatar_url: string
}

type Inquiry = {
  id: string
  email: string
  content: string
  status: 'pending' | 'resolved' | 'ignored'
  created_at: string
  user_id: string | null
  users: {
      email: string
  } | null
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [activeTab, setActiveTab] = useState<'comments' | 'tier_lists' | 'banned' | 'inquiries'>('comments')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAdminAndFetchReports()
  }, [])

  useEffect(() => {
    if (isAdmin) {
        if (activeTab === 'banned') {
            fetchBannedUsers()
        } else if (activeTab === 'inquiries') {
            fetchInquiries()
        }
    }
  }, [activeTab, isAdmin])

  const checkAdminAndFetchReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (userError || !userData?.is_admin) {
        router.push('/')
        return
      }

      setIsAdmin(true)
      fetchReports()
    } catch (error) {
      console.error('Error checking admin status:', error)
      router.push('/')
    }
  }

  const fetchReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        comment:comments (
          id,
          content,
          created_at,
          tier_list_id,
          author:users (
            id,
            email,
            is_banned
          )
        ),
        tier_list:tier_lists (
          id,
          title,
          description,
          created_at,
          author:users (
            id,
            email,
            is_banned
          )
        ),
        reporter:users (
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
    } else {
      setReports(data as any)
    }
    setLoading(false)
  }

  const fetchBannedUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url')
        .eq('is_banned', true)
    
    if (error) {
        console.error("Error fetching banned users", error)
    } else {
        setBannedUsers(data as BannedUser[])
    }
    setLoading(false)
  }

  const fetchInquiries = async () => {
      setLoading(true)
      const { data, error } = await supabase
          .from('inquiries')
          .select(`
              *,
              users(email)
          `)
          .order('created_at', { ascending: false })
      
      if (error) {
          console.error('Error fetching inquiries:', error)
      } else {
          setInquiries(data as Inquiry[])
      }
      setLoading(false)
  }

  const handleUpdateInquiryStatus = async (inquiryId: string, newStatus: 'pending' | 'resolved' | 'ignored') => {
      const { error } = await supabase
          .from('inquiries')
          .update({ status: newStatus })
          .eq('id', inquiryId)
      
      if (error) {
          alert('Failed to update status: ' + error.message)
      } else {
          fetchInquiries()
      }
  }

  const handleDismiss = async (reportId: string) => {
    if (!confirm('Are you sure you want to dismiss this report?')) return

    const { data, error } = await supabase
      .from('reports')
      .update({ status: 'dismissed' })
      .eq('id', reportId)
      .select()

    if (error) {
      alert('Error dismissing report: ' + error.message)
      console.error(error)
    } else if (!data || data.length === 0) {
      alert('Failed to dismiss report. You might not have permission.')
    } else {
      fetchReports()
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) return

    const { data, error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .select()

    if (deleteError) {
      alert('Error deleting comment: ' + deleteError.message)
      console.error(deleteError)
      return
    }

    if (!data || data.length === 0) {
      alert('Failed to delete comment. You might not have permission.')
      return
    }

    fetchReports()
  }

  const handleDeleteTierList = async (tierListId: string) => {
      if (!confirm('Are you sure you want to delete this Tier List? This cannot be undone.')) return

      const result = await deleteTierList(tierListId)
      if (result.error) {
          alert(result.error)
      } else {
          alert('Tier List deleted successfully.')
          fetchReports()
      }
  }

  const handleBanUser = async (userId: string) => {
      if (!confirm('Really ban this user? They will be unable to post content.')) return

      const { data, error } = await supabase
        .from('users')
        .update({ is_banned: true })
        .eq('id', userId)
        .select()
      
      if (error) {
          alert("Error banning user: " + error.message)
      } else if (!data || data.length === 0) {
          alert("Failed to ban user. Permission denied.")
      } else {
          alert("User has been banned.")
          fetchReports()
      }
  }

  const handleUnbanUser = async (userId: string) => {
      if (!confirm('Unban this user?')) return

      const { data, error } = await supabase
        .from('users')
        .update({ is_banned: false })
        .eq('id', userId)
        .select()
      
      if (error) {
          alert("Error unbanning user: " + error.message)
      } else if (!data || data.length === 0) {
          alert("Failed to unban user. Permission denied.")
      } else {
          fetchBannedUsers()
          fetchReports()
      }
  }

  if (loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-2">
          <AlertTriangle className="text-amber-500" />
          Admin Dashboard
        </h1>

        <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-1 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-2 font-medium text-sm rounded-t-md transition-colors whitespace-nowrap ${activeTab === 'comments' ? 'bg-white text-indigo-600 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Comment Reports
            </button>
            <button 
                onClick={() => setActiveTab('tier_lists')}
                className={`px-4 py-2 font-medium text-sm rounded-t-md transition-colors whitespace-nowrap ${activeTab === 'tier_lists' ? 'bg-white text-indigo-600 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Tier List Reports
            </button>
            <button 
                onClick={() => setActiveTab('banned')}
                className={`px-4 py-2 font-medium text-sm rounded-t-md transition-colors whitespace-nowrap ${activeTab === 'banned' ? 'bg-white text-indigo-600 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Banned Users
            </button>
            <button 
                onClick={() => setActiveTab('inquiries')}
                className={`px-4 py-2 font-medium text-sm rounded-t-md transition-colors whitespace-nowrap ${activeTab === 'inquiries' ? 'bg-white text-indigo-600 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Inquiries
            </button>
        </div>

        {(activeTab === 'comments' || activeTab === 'tier_lists') && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
                {reports.filter(r => activeTab === 'comments' ? !!r.comment : !!r.tier_list).length === 0 ? (
                <li className="px-6 py-12 text-center text-gray-500">
                    No {activeTab === 'comments' ? 'comment' : 'tier list'} reports found. Good job!
                </li>
                ) : (
                reports.filter(r => activeTab === 'comments' ? !!r.comment : !!r.tier_list).map((report) => (
                    <li key={report.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                            Reason: {report.reason}
                            </p>
                            <p className="mt-1 flex items-center text-sm text-gray-500">
                            Status: 
                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                report.status === 'dismissed' ? 'bg-gray-100 text-gray-800' :
                                'bg-green-100 text-green-800'
                            }`}>
                                {report.status}
                            </span>
                            </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                            <p className="text-sm text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                            <div className="mr-6">
                            <p className="text-sm text-gray-900 font-semibold">
                                Reported by:
                            </p>
                            <p className="text-sm text-gray-500">
                                {report.reporter?.email || 'Unknown User'}
                            </p>
                            </div>
                            
                            {/* Content Display (Comment or Tier List) */}
                            {report.comment ? (
                            <div className="mt-2 sm:mt-0">
                                <p className="text-sm text-gray-900 font-semibold">
                                Comment Content:
                                </p>
                                <p className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-2 mt-1">
                                "{report.comment.content}"
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                Author: {report.comment.author?.email || 'Unknown'}
                                </p>
                            </div>
                            ) : report.tier_list ? (
                                <div className="mt-2 sm:mt-0">
                                    <p className="text-sm text-gray-900 font-semibold flex items-center gap-1">
                                        <FileText size={14} /> Tier List:
                                    </p>
                                    <div className="text-sm text-gray-600 border-l-2 border-indigo-300 pl-2 mt-1">
                                        <p className="font-bold">{report.tier_list.title}</p>
                                        <p className="text-xs italic truncate max-w-xs">{report.tier_list.description}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Author: {report.tier_list.author?.email || 'Unknown'}
                                    </p>
                                </div>
                            ) : (
                            <div className="mt-2 sm:mt-0 text-sm text-gray-500 italic">
                                (Content has been deleted)
                            </div>
                            )}
                        </div>
                        
                        <div className="mt-4 sm:mt-0 sm:ml-5 flex items-center space-x-2">
                            {report.tier_list && (
                                <a
                                    href={`/tier-lists/${report.tier_list.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                >
                                    <ExternalLink className="mr-1.5 h-4 w-4 text-gray-500" />
                                    Open
                                </a>
                            )}

                            {report.comment && report.comment.tier_list_id && (
                                <a
                                    href={`/tier-lists/${report.comment.tier_list_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                >
                                    <ExternalLink className="mr-1.5 h-4 w-4 text-gray-500" />
                                    Open
                                </a>
                            )}

                                <button
                                    onClick={() => handleDismiss(report.id)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none"
                                >
                                    <CheckCircle className="mr-1.5 h-4 w-4 text-gray-500" />
                                    Dismiss
                                </button>
                                
                                {report.comment && (
                                    <button
                                        onClick={() => handleDeleteComment(report.comment!.id)}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 focus:outline-none"
                                    >
                                        <Trash2 className="mr-1.5 h-4 w-4" />
                                        Delete Comment
                                    </button>
                                )}

                                {report.tier_list && (
                                    <button
                                        onClick={() => handleDeleteTierList(report.tier_list!.id)}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 focus:outline-none"
                                    >
                                        <Trash2 className="mr-1.5 h-4 w-4" />
                                        Delete Tier List
                                    </button>
                                )}

                                {/* Ban/Unban Logic */}
                                {(report.comment?.author || report.tier_list?.author) && (
                                    (() => {
                                        const author = report.comment?.author || report.tier_list?.author;
                                        return author!.is_banned ? (
                                            <button
                                                onClick={() => handleUnbanUser(author!.id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                                            >
                                                <ShieldOff className="mr-1.5 h-4 w-4" />
                                                Unban User
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleBanUser(author!.id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-gray-800 hover:bg-black focus:outline-none"
                                            >
                                                <ShieldOff className="mr-1.5 h-4 w-4" />
                                                Ban User
                                            </button>
                                        );
                                    })()
                                )}
                        </div>
                        </div>
                    </div>
                    </li>
                ))
                )}
            </ul>
            </div>
        )}

        {activeTab === 'banned' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {bannedUsers.length === 0 ? (
                        <li className="px-6 py-12 text-center text-gray-500">
                            No banned users.
                        </li>
                    ) : (
                        bannedUsers.map(user => (
                            <li key={user.id} className="px-4 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full rounded-full" /> : <UserX size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{user.email}</p>
                                        <p className="text-xs text-gray-500">{user.full_name}</p>
                                        <p className="text-xs text-red-500 font-mono">{user.id}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleUnbanUser(user.id)}
                                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Unban
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        )}

        {activeTab === 'inquiries' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {inquiries.length === 0 ? (
                        <li className="px-6 py-12 text-center text-gray-500">
                            No inquiries yet.
                        </li>
                    ) : (
                        inquiries.map(inquiry => (
                            <li key={inquiry.id} className="px-4 py-4 hover:bg-gray-50">
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{inquiry.email}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(inquiry.created_at).toLocaleString()} 
                                                {inquiry.user_id && <span className="ml-2 text-indigo-500">(Logged in)</span>}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                inquiry.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-200 text-gray-600'
                                            }`}>
                                                {inquiry.status}
                                            </span>
                                            <select 
                                                value={inquiry.status}
                                                onChange={(e) => handleUpdateInquiryStatus(inquiry.id, e.target.value as any)}
                                                className="text-xs border rounded p-1 text-gray-900 bg-white"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="ignored">Ignored</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-2 bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap text-gray-700">
                                        {inquiry.content}
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        )}
      </div>
    </div>
  )
}
