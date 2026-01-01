import { createClient } from '@/utils/supabase/client'

/**
 * Extract storage file path from Supabase public URL
 */
export function extractStoragePathFromUrl(imageUrl: string): string | null {
  if (!imageUrl) return null

  // Match pattern: https://{project}.supabase.co/storage/v1/object/public/category_images/{path}
  const match = imageUrl.match(/\/storage\/v1\/object\/public\/category_images\/(.+)$/)
  return match ? match[1] : null
}

/**
 * Check if an image is used by other tier lists
 * @param imageUrl - The image URL to check
 * @param excludeTierListId - Optional tier list ID to exclude from the check
 * @returns true if the image is used by other tier lists
 */
export async function isImageUsedByOtherTierLists(
  imageUrl: string,
  excludeTierListId?: string
): Promise<boolean> {
  if (!imageUrl) return false

  const supabase = createClient()

  let query = supabase
    .from('items')
    .select('id, tier_list_id')
    .eq('image_url', imageUrl)

  // Exclude the specified tier list if provided
  if (excludeTierListId) {
    query = query.neq('tier_list_id', excludeTierListId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error checking image usage:', error)
    return true // If error, assume it's used to be safe
  }

  // If any items use this image, it's in use
  return data && data.length > 0
}

/**
 * Delete an image from Supabase storage if it's not used by other tier lists
 * @param imageUrl - The image URL to delete
 * @param excludeTierListId - Optional tier list ID to exclude from the usage check
 * @returns true if the image was deleted, false otherwise
 */
export async function deleteImageIfUnused(
  imageUrl: string,
  excludeTierListId?: string
): Promise<boolean> {
  if (!imageUrl) return false

  // Skip deletion for external URLs (Cloudflare Images, etc.)
  if (imageUrl.includes('imagedelivery.net')) {
    return false
  }

  // Check if the image is used by other tier lists
  const isUsed = await isImageUsedByOtherTierLists(imageUrl, excludeTierListId)

  if (isUsed) {
    console.log('Image is still in use, skipping deletion:', imageUrl)
    return false
  }

  // Extract file path from URL
  const filePath = extractStoragePathFromUrl(imageUrl)
  if (!filePath) {
    console.error('Could not extract file path from URL:', imageUrl)
    return false
  }

  // Delete from storage
  const supabase = createClient()
  const { error } = await supabase.storage
    .from('category_images')
    .remove([filePath])

  if (error) {
    console.error('Error deleting image from storage:', error)
    return false
  }

  console.log('Successfully deleted unused image:', filePath)
  return true
}
