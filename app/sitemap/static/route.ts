import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const baseUrl = 'https://tier-lst.com'

  const staticPages = [
    { url: baseUrl, priority: 1.0, changefreq: 'daily' },
    { url: `${baseUrl}/search`, priority: 0.8, changefreq: 'daily' },
    { url: `${baseUrl}/ranking`, priority: 0.8, changefreq: 'daily' },
    { url: `${baseUrl}/tier-lists/new`, priority: 0.7, changefreq: 'weekly' },
    { url: `${baseUrl}/privacy`, priority: 0.3, changefreq: 'monthly' },
    { url: `${baseUrl}/terms`, priority: 0.3, changefreq: 'monthly' },
    { url: `${baseUrl}/contact`, priority: 0.4, changefreq: 'monthly' },
    { url: `${baseUrl}/usage`, priority: 0.4, changefreq: 'monthly' },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
