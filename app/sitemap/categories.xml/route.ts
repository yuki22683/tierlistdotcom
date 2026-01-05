import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const baseUrl = 'https://tier-lst.com'

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, updated_at')
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching categories for sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(categories || [])
  .map(
    (category) => `  <url>
    <loc>${baseUrl}/categories/${category.id}</loc>
    <lastmod>${category.updated_at ? new Date(category.updated_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=7200',
    },
  })
}
