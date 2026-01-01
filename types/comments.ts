import { User } from '@supabase/supabase-js'

export type CommentWithProfile = {
  id: string
  content: string
  created_at: string
  updated_at: string
  like_count: number
  dislike_count: number
  parent_id: string | null
  user_id: string
  users: {
    full_name: string | null
    avatar_url: string | null
  } | null
  likes?: { user_id: string }[] 
  dislikes?: { user_id: string }[]
}
