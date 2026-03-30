/**
 * Sitemap.xml 生成器
 * Next.js 15+ Metadata API
 */

import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio'

  // 主要页面
  const mainPages = [
    {
      path: '',
      priority: 1,
      changeFreq: 'weekly' as const,
    },
    {
      path: '/pricing',
      priority: 0.9,
      changeFreq: 'weekly' as const,
    },
    {
      path: '/design-system',
      priority: 0.8,
      changeFreq: 'weekly' as const,
    },
    {
      path: '/feedback',
      priority: 0.7,
      changeFreq: 'monthly' as const,
    },
    {
      path: '/monitoring-example',
      priority: 0.6,
      changeFreq: 'monthly' as const,
    },
  ]

  // Demo 页面
  const demoPages = [
    {
      path: '/image-optimization-demo',
      priority: 0.8,
      changeFreq: 'weekly' as const,
    },
    {
      path: '/notification-demo',
      priority: 0.7,
      changeFreq: 'monthly' as const,
    },
    {
      path: '/websocket-status-demo',
      priority: 0.7,
      changeFreq: 'monthly' as const,
    },
    {
      path: '/dark-mode-demo',
      priority: 0.6,
      changeFreq: 'monthly' as const,
    },
    {
      path: '/ui-components-demo',
      priority: 0.6,
      changeFreq: 'monthly' as const,
    },
    {
      path: '/i18n-demo',
      priority: 0.6,
      changeFreq: 'monthly' as const,
    },
    {
      path: '/mobile-optimization-demo',
      priority: 0.6,
      changeFreq: 'monthly' as const,
    },
  ]

  // 多语言页面
  const locales = ['zh', 'en']
  const localePages = [
    {
      path: '/knowledge-lattice',
      priority: 0.8,
      changeFreq: 'weekly' as const,
    },
  ]

  const routes: MetadataRoute.Sitemap = [
    // 主要页面
    ...mainPages.map((page) => ({
      url: `${baseUrl}${page.path}`,
      lastModified: new Date('2026-03-29'),
      changeFrequency: page.changeFreq,
      priority: page.priority,
    })),
    // Demo 页面
    ...demoPages.map((page) => ({
      url: `${baseUrl}${page.path}`,
      lastModified: new Date('2026-03-29'),
      changeFrequency: page.changeFreq,
      priority: page.priority,
    })),
    // 多语言页面
    ...locales.flatMap((locale) =>
      localePages.map((page) => ({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: new Date('2026-03-29'),
        changeFrequency: page.changeFreq,
        priority: page.priority,
        alternates: {
          languages: {
            'zh-CN': `${baseUrl}/zh${page.path}`,
            en: `${baseUrl}/en${page.path}`,
          },
        },
      }))
    ),
  ]

  return routes
}
