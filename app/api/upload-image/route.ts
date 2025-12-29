import { NextRequest, NextResponse } from 'next/server'
import { uploadToCloudflareImages } from '@/lib/cloudflare-images'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Upload to Cloudflare Images
    const result = await uploadToCloudflareImages(file)

    // Return image ID and URL
    return NextResponse.json({
      id: result.id,
      url: `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}/${result.id}/public`,
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
