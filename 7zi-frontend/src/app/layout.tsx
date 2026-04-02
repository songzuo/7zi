/**
 * 根布局文件 - 包含图片优化配置、主题管理和 i18n
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { I18nProvider } from './providers/I18nProvider'
import { PermissionProvider } from './providers/PermissionProvider'
import { MonitoringProvider } from './providers/MonitoringProvider'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

// JSON-LD 结构化数据
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '7zi Frontend',
  url: 'https://7zi.studio',
  description: 'Next.js 图片优化最佳实践展示',
  inLanguage: 'zh-CN',
  author: {
    '@type': 'Organization',
    name: '7zi',
  },
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'),
  title: '7zi Frontend - 图片优化示例',
  description: 'Next.js 图片优化最佳实践展示',
  keywords: ['Next.js', 'Image Optimization', 'WebP', 'AVIF', 'Performance'],
  openGraph: {
    title: '7zi Frontend - 图片优化示例',
    description: 'Next.js 图片优化最佳实践展示',
    images: ['/images/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/images/twitter-image.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* JSON-LD 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* 预连接到图片 CDN */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className={inter.className}>
        <MonitoringProvider>
          <I18nProvider>
            <PermissionProvider>{children}</PermissionProvider>
          </I18nProvider>
        </MonitoringProvider>
      </body>
    </html>
  )
}
