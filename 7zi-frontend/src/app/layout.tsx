/**
 * 根布局文件 - 包含图片优化配置、主题管理和 i18n
 * v1.13.0: 集成移动端导航增强、Safe Area 支持、PWA 优化
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { I18nProvider } from './providers/I18nProvider'
import { PermissionProvider } from './providers/PermissionProvider'
import { MonitoringProvider } from './providers/MonitoringProvider'
import { ThemeProvider } from '@/lib/theme'
import { getThemeScript } from '@/lib/theme/theme-script'
import CookieConsentBanner from '@/components/cookie-consent/CookieConsentBanner'
import { GA4Init } from '@/components/analytics/GA4Init'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'

// JSON-LD 结构化数据
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '7zi Frontend',
  url: siteUrl,
  description: 'Next.js 图片优化最佳实践演示项目 - 智能体协作平台',
  inLanguage: 'zh-CN',
  author: {
    '@type': 'Organization',
    name: '7zi',
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'),
  title: {
    default: '7zi Frontend - 智能体协作平台',
    template: '%s | 7zi Frontend',
  },
  description: 'Next.js 最佳实践演示项目 - 智能体协作平台',
  keywords: ['Next.js', 'Image Optimization', 'WebP', 'AVIF', 'Performance'],
  // PWA 相关
  manifest: '/manifest.json',
  // Apple iOS Smart App Banner
  appleWebApp: {
    capable: true,
    title: '7zi',
    statusBarStyle: 'default',
  },
  // 移动端优化 - 使用其它元标签方式
  // 注意: apple-mobile-web-app-* 标签需要通过 other meta 方式添加
  formatDetection: {
    telephone: false,
  },
  // Open Graph
  openGraph: {
    title: '7zi Frontend - 智能体协作平台',
    description: 'Next.js 最佳实践演示项目 - 智能体协作平台',
    images: ['/images/og-image.jpg'],
    type: 'website',
    locale: 'zh_CN',
    siteName: '7zi Frontend',
  },
  // Twitter
  twitter: {
    card: 'summary_large_image',
    images: ['/images/twitter-image.jpg'],
  },
}

// Next.js 16 规范：viewport 需要独立 export
export const viewport = {
  themeColor: '#667eea',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // 支持 Safe Area - 适配刘海屏
  viewportFit: 'cover',
  // 用户缩放（可访问性）
  userScalable: true,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* PWA 图标 */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* 预连接到图片 CDN */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {/* 启动画面（iOS） */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/ipad-pro-2.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/ipad-pro-1.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/iphone-14.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/iphone-8.png"
        />
        {/* JSON-LD 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Theme initialization script - must run before React to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{ __html: getThemeScript() }}
          id="theme-init"
          data-noparse="true"
        />
        {/* Safe Area 支持 - 适配 iOS 刘海屏 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, user-scalable=yes" />
      </head>
      <body className={inter.className}>
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:font-semibold focus:shadow-lg focus:outline-none"
        >
          跳转到主要内容
        </a>

        <ThemeProvider>
          <CookieConsentBanner />
          <MonitoringProvider>
            <I18nProvider>
              <PermissionProvider>
                {/* Safe Area 适配 - 顶部安全区域 */}
                <div className="safe-area-top min-h-screen">
                  {children}
                </div>
              </PermissionProvider>
            </I18nProvider>
          </MonitoringProvider>
        </ThemeProvider>

        {/* Google Analytics 4 - must be inside body, after children */}
        <GA4Init />
      </body>
    </html>
  )
}
