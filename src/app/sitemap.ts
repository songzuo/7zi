/**
 * Sitemap.xml 生成器
 * Next.js 15+ Metadata API
 */

import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'

  // 主要页面
  const mainPages = [
    '',
    '/image-optimization-demo',
    '/notification-demo',
    '/notification-demo/enhanced',
    '/design-system',
    '/feedback',
    '/i18n-demo',
    '/dark-mode-demo',
    '/websocket-status-demo',
    '/monitoring-example',
  ]

  // 多语言页面
  const locales = ['zh-CN', 'en']
  const localePages = ['/knowledge-lattice']

  const routes: MetadataRoute.Sitemap = [
    // 主要页面
    ...mainPages.map(route => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
    })),
    // 多语言页面
    ...locales.flatMap(locale =>
      localePages.map(route => ({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: {
          languages: {
            'zh-CN': `${baseUrl}/zh-CN${route}`,
            en: `${baseUrl}/en${route}`,
          },
        },
      }))
    ),
  ]

  return routes
}
