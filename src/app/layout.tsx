import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Providers } from '@/components/Providers'
import { ClientAnalytics } from '@/components/ClientAnalytics'
import Image from 'next/image'
import { getBrand } from '@/config/brand'
import './globals.css'

const geistSans = localFont({ src: './fonts/Geist-Regular.woff2', variable: '--font-geist-sans', display: 'swap' })

const geistMono = localFont({ src: './fonts/GeistMono-Regular.woff2', variable: '--font-geist-mono', display: 'swap' })

const brand = getBrand()
const baseUrl = brand.baseUrl

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: brand.id === '7zi'
      ? '7zi Shop — Quality Products from China, Delivered Worldwide'
      : 'SZSPD - Cross-border E-commerce Serving Ghana, Africa & the World',
    template: `%s | ${brand.siteName}`,
  },
  description: brand.shopDescription,
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
  authors: [{ name: brand.shortName, url: baseUrl }],
  creator: brand.shortName,
  publisher: brand.shortName,
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
    siteName: brand.siteName,
    title: brand.shopTitle,
    description:
      '由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务',
    images: [
      {
        url: `${baseUrl}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: brand.shopTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: brand.shopTitle,
    description:
      '由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务',
    images: [`${baseUrl}/og-image.svg`],
    creator: '@szspd',
    site: '@szspd',
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
    title: brand.shortName,
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
    'apple-mobile-web-app-title': 'SZSPD',
    'mobile-web-app-capable': 'yes',
    'application-name': 'SZSPD',
    'msapplication-TileColor': '#06b6d4',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#06b6d4',
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
        <meta name="apple-mobile-web-app-title" content="SZSPD" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="SZSPD" />
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

        {/* Performance: Preconnect to image CDN */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />

        {/* Performance: DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* Theme Script - Prevents Flash of Unstyled Content (FOUC) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('7zi-user-settings')||'{}');var theme=t.theme||'system';if(theme==='system')theme=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.classList.add(theme);}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: brand.shortName,
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
                telephone: brand.contactPhoneHref.replace('tel:', ''),
                email: brand.contactEmail,
                availableLanguage: ['Chinese', 'English'],
              },
              sameAs: [
                baseUrl,
                ...(brand.features.africaCorridor ? ['https://wa.me/233248009090'] : []),
                'https://wa.me/8613319551131',
              ],
            }),
          }}
        />
      
        {/* Service Worker Cleanup - Remove cached SW and caches */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(registrations){registrations.forEach(function(reg){reg.unregister()})})}if('caches' in window){caches.keys().then(function(names){names.forEach(function(name){caches.delete(name)})})}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ClientAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
