/**
 * Robots.txt 生成器
 * Next.js 15+ Metadata API
 */

import { MetadataRoute } from 'next'
import { getBrand } from '@/config/brand'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || getBrand().baseUrl

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/.git/', '/node_modules/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
