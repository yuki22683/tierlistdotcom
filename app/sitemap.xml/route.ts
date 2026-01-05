import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ITEMS_PER_SITEMAP = 10000
const TIER_LISTS_PER_SITEMAP = 10000

export async function GET() {
  try {
    const supabase = await createClient()
    const baseUrl = 'https://tier-lst.com'

    // 1. Tier List のページ数計算
    const { count: tierListCount } = await supabase
      .from('tier_lists')
      .select('*', { count: 'exact', head: true })

    // 2. アイテムのページ数計算（全取得を避けて概算で計算）
    // ユニークな名前を数えるのは重いため、全アイテム数で代用
    // これにより、サイトマップのページ数は多めに見積もられるが、タイムアウトは防げる
    const { count: totalItemCount } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })

    const tierListPages = Math.ceil((tierListCount || 0) / TIER_LISTS_PER_SITEMAP)
    const itemPages = Math.ceil((totalItemCount || 0) / ITEMS_PER_SITEMAP)

    const now = new Date().toISOString()

    let sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap/static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap/categories.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`

    // ティアリストの分割サイトマップ
    for (let i = 1; i <= Math.max(1, tierListPages); i++) {
      sitemapIndex += `
  <sitemap>
    <loc>${baseUrl}/sitemap/tier-lists/${i}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
    }

    // アイテムの分割サイトマップ
    for (let i = 1; i <= Math.max(1, itemPages); i++) {
      sitemapIndex += `
  <sitemap>
    <loc>${baseUrl}/sitemap/items/${i}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
    }

    sitemapIndex += `
</sitemapindex>`

    return new NextResponse(sitemapIndex, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Sitemap index generation error:', error)
    // エラー時は最低限の静的サイトマップだけでも返す
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://tier-lst.com/sitemap/static.xml</loc>
  </sitemap>
</sitemapindex>`, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }
}