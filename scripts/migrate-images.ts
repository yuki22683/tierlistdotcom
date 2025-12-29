/**
 * Migrate images from Supabase Storage to Cloudflare Images
 *
 * Usage:
 * npx tsx scripts/migrate-images.ts
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!
const CLOUDFLARE_ACCOUNT_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface ImageToMigrate {
  url: string
  tableName: string
  columnName: string
  idColumn: string
  id: string
}

/**
 * Upload image to Cloudflare Images
 */
async function uploadToCloudflare(imageUrl: string): Promise<string> {
  // Fetch image from Supabase
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${imageUrl}`)
  }

  const blob = await response.blob()
  const formData = new FormData()
  formData.append('file', blob, 'image.jpg')

  // Upload to Cloudflare
  const uploadResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    }
  )

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json()
    throw new Error(`Cloudflare upload failed: ${JSON.stringify(error)}`)
  }

  const result = await uploadResponse.json()
  const imageId = result.result.id

  return `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${imageId}/public`
}

/**
 * Get all unique image URLs from database
 */
async function getAllImageUrls(): Promise<ImageToMigrate[]> {
  const images: ImageToMigrate[] = []

  // Get images from categories table
  const { data: categories } = await supabase
    .from('categories')
    .select('id, image_url')
    .not('image_url', 'is', null)

  if (categories) {
    for (const cat of categories) {
      images.push({
        url: cat.image_url,
        tableName: 'categories',
        columnName: 'image_url',
        idColumn: 'id',
        id: cat.id,
      })
    }
  }

  // Get images from items table
  const { data: items } = await supabase
    .from('items')
    .select('id, image_url')
    .not('image_url', 'is', null)

  if (items) {
    for (const item of items) {
      images.push({
        url: item.image_url,
        tableName: 'items',
        columnName: 'image_url',
        idColumn: 'id',
        id: item.id,
      })
    }
  }

  // Deduplicate by URL
  const uniqueUrls = new Map<string, ImageToMigrate>()
  for (const img of images) {
    if (!uniqueUrls.has(img.url)) {
      uniqueUrls.set(img.url, img)
    }
  }

  return Array.from(uniqueUrls.values())
}

/**
 * Update database with new Cloudflare Images URL
 */
async function updateDatabaseUrl(
  tableName: string,
  idColumn: string,
  id: string,
  columnName: string,
  newUrl: string
): Promise<void> {
  const { error } = await supabase
    .from(tableName)
    .update({ [columnName]: newUrl })
    .eq(idColumn, id)

  if (error) {
    throw new Error(`Failed to update ${tableName}: ${error.message}`)
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting image migration from Supabase to Cloudflare Images...\n')

  // Get all images
  const images = await getAllImageUrls()
  console.log(`📊 Found ${images.length} unique images to migrate\n`)

  let successCount = 0
  let failCount = 0

  // Process each image
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    console.log(`[${i + 1}/${images.length}] Processing: ${img.url}`)

    try {
      // Upload to Cloudflare
      const newUrl = await uploadToCloudflare(img.url)
      console.log(`  ✅ Uploaded to Cloudflare: ${newUrl}`)

      // Update all references in database
      const { data: allReferences } = await supabase
        .from(img.tableName)
        .select(`${img.idColumn}`)
        .eq(img.columnName, img.url)

      if (allReferences) {
        for (const ref of allReferences) {
          await updateDatabaseUrl(
            img.tableName,
            img.idColumn,
            ref[img.idColumn],
            img.columnName,
            newUrl
          )
        }
        console.log(`  ✅ Updated ${allReferences.length} database references`)
      }

      successCount++
    } catch (error) {
      console.error(`  ❌ Failed:`, error)
      failCount++
    }

    console.log('')
  }

  console.log('✨ Migration complete!')
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
}

// Run migration
migrate().catch(console.error)
