import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'

const ITEMS_PER_SITEMAP = 10000
const TIER_LISTS_PER_SITEMAP = 10000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const baseUrl = 'https://tier-lst.com'

  // Count tier lists and items to determine number of sitemap pages needed
  const { count: tierListCount } = await supabase
    .from('tier_lists')
    .select('*', { count: 'exact', head: true })

  const { data: items } = await supabase
    .from('items')
    .select('name')

  const uniqueItemCount = new Set(items?.map(i => i.name) || []).size

  const tierListPages = Math.ceil((tierListCount || 0) / TIER_LISTS_PER_SITEMAP)
  const itemPages = Math.ceil(uniqueItemCount / ITEMS_PER_SITEMAP)

  const sitemaps: MetadataRoute.Sitemap = [
    // Static pages sitemap
    {
      url: `${baseUrl}/sitemap/static.xml`,
      lastModified: new Date(),
    },
  ]

  // Add tier list sitemaps
  for (let i = 1; i <= tierListPages; i++) {
    sitemaps.push({
      url: `${baseUrl}/sitemap/tier-lists/${i}.xml`,
      lastModified: new Date(),
    })
  }

  // Add item sitemaps
  for (let i = 1; i <= itemPages; i++) {
    sitemaps.push({
      url: `${baseUrl}/sitemap/items/${i}.xml`,
      lastModified: new Date(),
    })
  }

  // Add categories sitemap
  sitemaps.push({
    url: `${baseUrl}/sitemap/categories.xml`,
    lastModified: new Date(),
  })

  return sitemaps
}
