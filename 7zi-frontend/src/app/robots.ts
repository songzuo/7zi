/**
 * Robots.txt 生成器
 * Next.js 15+ Metadata API
 */

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/api/v1/',
          '/api/v2/',
          '/admin/',
          '/dashboard/',
          '/settings/',
          '/_next/',
          '/_test-*',
          '/_demo-*',
          '/node_modules/',
          '/.git/',
          '/performance/',
          '/analytics/',
          '/health-dashboard/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    // host is not part of MetadataRoute.Robots in Next.js 15
  }
}
