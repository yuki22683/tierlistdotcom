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

  const offset = (page - 1) * ITEMS_PER_PAGE

  const { data: tierLists, error } = await supabase
    .from('tier_lists')
    .select('id, updated_at')
    .order('id', { ascending: true })
    .range(offset, offset + ITEMS_PER_PAGE - 1)

  if (error) {
    console.error('Error fetching tier lists for sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(tierLists || [])
  .map(
    (list) => `  <url>
    <loc>${baseUrl}/tier-lists/${list.id}</loc>
    <lastmod>${new Date(list.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
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
