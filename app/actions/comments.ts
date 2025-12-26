'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPushNotificationToUser } from '@/utils/pushNotifications'

export async function addComment(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const content = formData.get('content') as string
  const tierListId = formData.get('tierListId') as string | null
  const itemName = formData.get('itemName') as string | null
  const parentId = formData.get('parentId') as string | null

  if (!content || (!tierListId && !itemName)) {
    return { error: 'Missing required fields' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to comment' }
  }

  // Check daily limit
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const { count, error: countError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`);

  if (countError) {
      console.error('Error counting comments:', countError);
      return { error: 'Could not verify comment count.' };
  }

  if ((count || 0) >= 20) {
      return { error: '1日のコメント投稿数の上限は20件です。' };
  }

  const { error } = await supabase.from('comments').insert({
    user_id: user.id,
    tier_list_id: tierListId || null,
    item_name: itemName || null,
    parent_id: parentId || null,
    content: content
  })

  if (error) {
    console.error('Error adding comment:', error)
    return { error: 'Failed to add comment' }
  }

  // プッシュ通知を送信（ティアリストへのコメントのみ）
  if (tierListId) {
    try {
      // ティアリストの作成者とタイトルを取得
      const { data: tierList } = await supabase
        .from('tier_lists')
        .select('user_id, title')
        .eq('id', tierListId)
        .single()

      // 自分へのコメントは通知しない
      if (tierList && tierList.user_id !== user.id) {
        // コメント投稿者の名前を取得
        const { data: commenter } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()

        const commenterName = commenter?.username || 'ゲスト'
        const truncatedContent = content.length > 50
          ? content.substring(0, 50) + '...'
          : content

        // 通知を送信（非同期で実行、エラーがあってもコメント投稿は成功）
        await sendPushNotificationToUser(tierList.user_id, {
          title: `「${tierList.title}」に新しいコメント`,
          body: `${commenterName}: ${truncatedContent}`,
          data: {
            tierListId: tierListId,
            type: 'comment'
          }
        }).catch(err => {
          // 通知送信失敗はログのみ（ユーザーには影響させない）
          console.error('Failed to send comment notification:', err)
        })
      }
    } catch (notificationError) {
      // 通知処理のエラーはログのみ（コメント投稿は成功とする）
      console.error('Error in notification process:', notificationError)
    }
  }

  revalidatePath(tierListId ? `/tier-lists/${tierListId}` : `/items/${itemName}`)
  return { success: true }
}

export async function toggleLike(commentId: string, currentPath: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { error: 'Must be logged in' }
    }

    // Check if already liked
    const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('comment_id', commentId)
        .maybeSingle()

    if (existingLike) {
        // Unlike
        await supabase.from('likes').delete().eq('id', existingLike.id)
    } else {
        // Like
        // Optional: Remove Dislike if exists
        const { data: existingDislike } = await supabase
            .from('dislikes')
            .select('id')
            .eq('user_id', user.id)
            .eq('comment_id', commentId)
            .maybeSingle()
            
        if (existingDislike) {
            await supabase.from('dislikes').delete().eq('id', existingDislike.id)
        }

        await supabase.from('likes').insert({
            user_id: user.id,
            comment_id: commentId
        })
    }

    revalidatePath(currentPath)
    return { success: true }
}

export async function toggleDislike(commentId: string, currentPath: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { error: 'Must be logged in' }
    }

    // Check if already disliked
    const { data: existingDislike } = await supabase
        .from('dislikes')
        .select('id')
        .eq('user_id', user.id)
        .eq('comment_id', commentId)
        .maybeSingle()

    if (existingDislike) {
        // Remove Dislike
        await supabase.from('dislikes').delete().eq('id', existingDislike.id)
    } else {
        // Add Dislike
        // Optional: Remove Like if exists (Mutually exclusive)
        const { data: existingLike } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('comment_id', commentId)
            .maybeSingle()
        
        if (existingLike) {
            await supabase.from('likes').delete().eq('id', existingLike.id)
        }

        await supabase.from('dislikes').insert({
            user_id: user.id,
            comment_id: commentId
        })
    }

    revalidatePath(currentPath)
    return { success: true }
}

export async function deleteComment(commentId: string, currentPath: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { error: 'Unauthorized' }

    // 1. Get the comment to identify the author and the tier list
    const { data: comment, error: fetchError } = await supabase
        .from('comments')
        .select('user_id, tier_list_id')
        .eq('id', commentId)
        .single()

    if (fetchError || !comment) return { error: 'Comment not found' }

    // 2. Check if the user is the author
    let isAuthorized = comment.user_id === user.id

    if (!isAuthorized) {
        // 3. Check if the user is an admin
        const { data: userData } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', user.id)
            .single()
        
        if (userData?.is_admin) {
            isAuthorized = true
        }
    }

    if (!isAuthorized && comment.tier_list_id) {
        // 4. Check if the user is the owner of the tier list
        const { data: tierList } = await supabase
            .from('tier_lists')
            .select('user_id')
            .eq('id', comment.tier_list_id)
            .single()
        
        if (tierList && tierList.user_id === user.id) {
            isAuthorized = true
        }
    }

    if (!isAuthorized) {
        return { error: 'Unauthorized' }
    }

    // 5. Delete the comment
    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

    if (error) return { error: 'Failed to delete' }

    revalidatePath(currentPath)
    return { success: true }
}

export async function reportComment(commentId: string, reason: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { error: 'Unauthorized' }

    if (!reason.trim()) return { error: 'Reason is required' }

    const { error } = await supabase
        .from('reports')
        .insert({
            user_id: user.id,
            comment_id: commentId,
            reason: reason
        })

    if (error) {
        console.error('Report error:', error)
        return { error: 'Failed to submit report' }
    }

    return { success: true }
}
