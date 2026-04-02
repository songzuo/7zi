import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/Providers'
import { ClientAnalytics } from '@/components/ClientAnalytics'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap', // 性能优化：字体加载策略
  preload: true, // 性能优化：预加载字体
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap', // 性能优化：字体加载策略
  preload: true, // 性能优化：预加载字体
})

const baseUrl = 'https://7zi.studio'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: '7zi Studio - AI 驱动的创新数字工作室',
    template: '%s | 7zi Studio',
  },
  description:
    '7zi Studio - 由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务',
  keywords: [
    'AI',
    '数字工作室',
    '网站开发',
    '品牌设计',
    '营销推广',
    'SEO 优化',
    'UI/UX 设计',
    'AI 代理',
    '数字化解决方案',
  ],
  authors: [{ name: '7zi Studio', url: baseUrl }],
  creator: '7zi Studio',
  publisher: '7zi Studio',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: baseUrl,
    siteName: '7zi Studio',
    title: '7zi Studio - AI 驱动的创新数字工作室',
    description:
      '由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务',
    images: [
      {
        url: `${baseUrl}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: '7zi Studio - AI 驱动的创新数字工作室',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '7zi Studio - AI 驱动的创新数字工作室',
    description:
      '由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务',
    images: [`${baseUrl}/og-image.svg`],
    creator: '@7zistudio',
    site: '@7zistudio',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '7zi Studio',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // PWA specific meta tags
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': '7zi Studio',
    'mobile-web-app-capable': 'yes',
    'application-name': '7zi Studio',
    'msapplication-TileColor': '#06b6d4',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#06b6d4',
  },
  alternates: {
    canonical: baseUrl,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="7zi Studio" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="7zi Studio" />
        <meta name="theme-color" content="#06b6d4" />
        <meta name="msapplication-TileColor" content="#06b6d4" />
        <link rel="apple-touch-startup-image" href="/apple-touch-startup-image.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Apple Touch Icons for different devices */}
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icon-144.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon-120.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme Script - Prevents Flash of Unstyled Content (FOUC) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){'use strict';const THEME_KEY='7zi-user-settings';function getTheme(){try{const stored=localStorage.getItem(THEME_KEY);if(stored){const settings=JSON.parse(stored);return settings.theme||'system';}}catch(e){console.error('Failed to read theme from localStorage:',e);}return'system';}function getEffectiveTheme(theme){if(theme==='system'){return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}return theme;}function applyTheme(theme){const root=document.documentElement;root.classList.remove('light','dark');root.classList.add(theme);root.style.colorScheme=theme;root.style.visibility='visible';}const theme=getTheme();const effectiveTheme=getEffectiveTheme(theme);applyTheme(effectiveTheme);if(typeof window!=='undefined'){(window).__THEME__={stored:theme,effective:effectiveTheme};}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: '7zi Studio',
              url: baseUrl,
              logo: `${baseUrl}/logo.png`,
              description:
                '由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务',
              foundingDate: '2024',
              founders: [
                {
                  '@type': 'Person',
                  name: '宋琢环球旅行',
                },
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer service',
                email: 'business@7zi.studio',
                availableLanguage: ['Chinese', 'English'],
              },
              sameAs: [
                'https://github.com/7zi-studio',
                'https://twitter.com/7zistudio',
                'https://linkedin.com/company/7zistudio',
              ],
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
