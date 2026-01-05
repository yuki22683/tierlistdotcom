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
  try {
    const params = await props.params
    const page = parseInt(params.page, 10)

    if (isNaN(page) || page < 1) {
      return new NextResponse('Invalid page number', { status: 400 })
    }

    const supabase = await createClient()
    const baseUrl = 'https://tier-lst.com'

    // JS側での全取得・重複排除を避け、SQL側で大まかに処理（RPCなどがない場合の代替案）
    // 本来はRPCで distinct name を取るのが理想だが、ここではメモリ負荷を抑えるため
    // 取得件数を制限して取得する
    const offset = (page - 1) * ITEMS_PER_PAGE
    
    // itemsテーブルから名前を取得。
    // 重複は許容するか、あるいはDB側でユニークインデックスがある前提で範囲取得する。
    // ここではまず「ページ範囲内」のデータを取得し、その中で重複排除する（メモリ節約）。
    const { data: items, error } = await supabase
      .from('items')
      .select('name')
      .order('name', { ascending: true })
      .range(offset, offset + ITEMS_PER_PAGE * 2) // 少し多めに取って重複を消す

    if (error) {
      throw error
    }

    // このページの範囲内でのユニーク化
    const uniqueNames = Array.from(new Set((items || []).map(i => i.name))).slice(0, ITEMS_PER_PAGE)

    if (uniqueNames.length === 0 && page > 1) {
      // 2ページ目以降でデータがない場合は空のURLセットを返す
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      })
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueNames
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
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200',
      },
    })
  } catch (error) {
    console.error('Error generating items sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}