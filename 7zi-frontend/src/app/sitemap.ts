/**
 * Sitemap.xml 生成器
 * Next.js 15+ Metadata API
 */

import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'
  const today = new Date()

  // 主要公开页面
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/feedback`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/design-system`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  // Demo / 示例页面 (确认存在的)
  const demoPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/image-optimization-demo`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/notification-demo`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mobile-optimization-demo`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/mobile-optimization-v1130`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/rich-text-editor-demo`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/collaboration-cursor-demo`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  // 设计系统子页面
  const designSystemPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/design-system/components`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/design-system/tokens`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/design-system/guidelines`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/design-system/responsive`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/design-system/changelog`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  // 多语言 (i18n) 页面
  const locales = ['zh', 'en'] as const
  const i18nPages = ['/knowledge-lattice', '/login']

  const i18nRoutes: MetadataRoute.Sitemap = locales.flatMap(locale =>
    i18nPages.map(path => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: today,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: {
          'zh-CN': `${baseUrl}/zh${path}`,
          en: `${baseUrl}/en${path}`,
        },
      },
    }))
  )

  return [
    ...mainPages,
    ...demoPages,
    ...designSystemPages,
    ...i18nRoutes,
  ]
}
