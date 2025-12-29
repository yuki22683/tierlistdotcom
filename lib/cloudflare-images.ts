/**
 * Cloudflare Images API utilities
 */

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!
const CLOUDFLARE_ACCOUNT_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH!

export interface CloudflareImageUploadResult {
  id: string
  filename: string
  uploaded: string
  requireSignedURLs: boolean
  variants: string[]
}

/**
 * Upload an image to Cloudflare Images
 * @param file - File or Blob to upload
 * @param metadata - Optional metadata object
 * @returns Upload result containing image ID and variants
 */
export async function uploadToCloudflareImages(
  file: File | Blob,
  metadata?: Record<string, string>
): Promise<CloudflareImageUploadResult> {
  const formData = new FormData()

  // Add file
  const filename = file instanceof File ? file.name : `image-${Date.now()}.jpg`
  formData.append('file', file, filename)

  // Add metadata if provided
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata))
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Cloudflare Images upload failed: ${JSON.stringify(error)}`)
  }

  const result = await response.json()
  return result.result
}

/**
 * Delete an image from Cloudflare Images
 * @param imageId - The image ID to delete
 */
export async function deleteFromCloudflareImages(imageId: string): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Cloudflare Images delete failed: ${JSON.stringify(error)}`)
  }
}

/**
 * Get the public URL for an image
 * @param imageId - The image ID
 * @param variant - The variant name (default: 'public')
 * @returns The public URL
 */
export function getCloudflareImageUrl(imageId: string, variant: string = 'public'): string {
  return `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${imageId}/${variant}`
}

/**
 * Extract image ID from Cloudflare Images URL
 * @param url - The Cloudflare Images URL
 * @returns The image ID or null if not a Cloudflare Images URL
 */
export function extractImageIdFromUrl(url: string): string | null {
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)/)
  return match ? match[1] : null
}
