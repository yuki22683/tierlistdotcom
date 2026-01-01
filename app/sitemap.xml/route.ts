import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ITEMS_PER_SITEMAP = 10000
const TIER_LISTS_PER_SITEMAP = 10000

export async function GET() {
  const supabase = await createClient()
  const baseUrl = 'https://tier-lst.com'

  // Count tier lists
  const { count: tierListCount } = await supabase
    .from('tier_lists')
    .select('*', { count: 'exact', head: true })

  // Count unique items
  // Note: This matches the logic in app/sitemap/items/[page]/route.ts
  const { data: items } = await supabase
    .from('items')
    .select('name')

  const uniqueItemCount = new Set(items?.map(i => i.name) || []).size

  const tierListPages = Math.ceil((tierListCount || 0) / TIER_LISTS_PER_SITEMAP)
  const itemPages = Math.ceil(uniqueItemCount / ITEMS_PER_SITEMAP)

  let sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap/static.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap/categories.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`

  for (let i = 1; i <= tierListPages; i++) {
    sitemapIndex += `
  <sitemap>
    <loc>${baseUrl}/sitemap/tier-lists/${i}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`
  }

  for (let i = 1; i <= itemPages; i++) {
    sitemapIndex += `
  <sitemap>
    <loc>${baseUrl}/sitemap/items/${i}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`
  }

  sitemapIndex += `
</sitemapindex>`

  return new NextResponse(sitemapIndex, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
