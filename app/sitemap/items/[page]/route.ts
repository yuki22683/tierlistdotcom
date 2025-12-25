import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 10000

interface Params {
  params: Promise<{
    page: string
  }>
}

export async function GET(request: Request, props: Params) {
  const params = await props.params
  const page = parseInt(params.page, 10)

  if (isNaN(page) || page < 1) {
    return new NextResponse('Invalid page number', { status: 400 })
  }

  const supabase = await createClient()
  const baseUrl = 'https://tier-lst.com'

  // Get all unique item names
  const { data: items, error } = await supabase
    .from('items')
    .select('name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching items for sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }

  // Get unique names
  const uniqueNames = [...new Set((items || []).map(i => i.name))]

  // Paginate
  const offset = (page - 1) * ITEMS_PER_PAGE
  const paginatedNames = uniqueNames.slice(offset, offset + ITEMS_PER_PAGE)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginatedNames
  .map(
    (name) => `  <url>
    <loc>${baseUrl}/items/${encodeURIComponent(name)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
