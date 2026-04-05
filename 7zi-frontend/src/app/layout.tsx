/**
 * 根布局文件 - 包含图片优化配置、主题管理和 i18n
 * 集成移动端导航增强：Safe Area 支持、汉堡菜单、底部导航栏
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { I18nProvider } from './providers/I18nProvider'
import { PermissionProvider } from './providers/PermissionProvider'
import { MonitoringProvider } from './providers/MonitoringProvider'
import { ThemeProvider } from '@/lib/theme'
import { getThemeScript } from '@/lib/theme/theme-script'

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
  title: {
    default: '7zi Frontend - 图片优化示例',
    template: '%s | 7zi Frontend',
  },
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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    // 支持 Safe Area - 适配刘海屏
    viewportFit: 'cover',
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
        {/* Theme initialization script - must run before React to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{ __html: getThemeScript() }}
          id="theme-init"
          data-noparse="true"
        />
        {/* Safe Area 支持 - 适配 iOS 刘海屏 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <MonitoringProvider>
            <I18nProvider>
              <PermissionProvider>
                {/* Safe Area 适配 - 顶部安全区域 */}
                <div className="safe-area-top">
                  {children}
                </div>
              </PermissionProvider>
            </I18nProvider>
          </MonitoringProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
