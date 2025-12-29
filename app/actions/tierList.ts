'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { deleteFromCloudflareImages, extractImageIdFromUrl } from '@/lib/cloudflare-images'

export async function deleteTierList(tierListId: string) {
  const supabase = await createClient()

  // 1. Check Authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // 2. Check Admin Status and Ownership
  const { data: userProfile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const { data: tierList } = await supabase
    .from('tier_lists')
    .select('user_id')
    .eq('id', tierListId)
    .single()

  if (!tierList) {
      return { error: 'Tier list not found' }
  }

  const isOwner = tierList.user_id === user.id
  const isAdmin = !!userProfile?.is_admin

  if (!isOwner && !isAdmin) {
    return { error: 'Unauthorized: You do not have permission to delete this tier list' }
  }

  // 3. Get items with images before deletion
  const { data: items } = await supabase
    .from('items')
    .select('image_url')
    .eq('tier_list_id', tierListId)
    .not('image_url', 'is', null)

  const imageUrls = items?.map(item => item.image_url).filter(Boolean) || []

  // 4. Delete Tier List using admin client (bypasses RLS after authorization check)
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('tier_lists')
    .delete()
    .eq('id', tierListId)

  if (error) {
    console.error('Error deleting tier list:', error)
    return { error: 'Failed to delete tier list: ' + error.message }
  }

  // 5. Clean up unused images after deletion
  for (const imageUrl of imageUrls) {
    try {
      // Check if this image is still used by other tier lists
      // Use adminClient to bypass RLS and see all items across all users
      const { data: otherItems } = await adminClient
        .from('items')
        .select('id')
        .eq('image_url', imageUrl)
        .limit(1)

      // If no other items use this image, delete it from Cloudflare Images
      if (!otherItems || otherItems.length === 0) {
        const imageId = extractImageIdFromUrl(imageUrl)
        if (imageId) {
          try {
            await deleteFromCloudflareImages(imageId)
            console.log('Successfully deleted unused image:', imageId)
          } catch (deleteError) {
            console.error('Failed to delete image from Cloudflare Images:', imageId, deleteError)
          }
        }
      } else {
        console.log('Image still in use by other tier lists, keeping:', imageUrl)
      }
    } catch (imageError) {
      console.error('Error cleaning up image:', imageUrl, imageError)
      // Continue with other images even if one fails
    }
  }

  // 6. Revalidate cache - 複数のページを再検証
  revalidatePath('/', 'layout')
  revalidatePath(`/users/${tierList.user_id}/tier-lists`)
  revalidatePath('/search')

  return { success: true }
}

export async function reportTierList(tierListId: string, reason: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }
  
  // Check if banned
  const { data: userProfile } = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', user.id)
      .single()

  if (userProfile?.is_banned) {
      return { error: 'アカウントが制限されています' }
  }

  const { error } = await supabase
    .from('reports')
    .insert({
        user_id: user.id,
        tier_list_id: tierListId,
        reason: reason,
        status: 'pending'
    })

  if (error) {
    console.error('Error reporting tier list:', error)
    return { error: '通報に失敗しました' }
  }

  return { success: true }
}