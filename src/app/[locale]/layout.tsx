/**
 * Root Layout Component
 *
 * This is the main layout component for the 7zi Studio application.
 * It handles internationalization, global state management, and provides
 * the base structure for all pages.
 *
 * @module app/[locale]/layout
 *
 * Global State Management:
 * The application uses Zustand stores for global state management:
 * - preferencesStore: Theme, language, and user preferences
 * - uiStore: Global loading, toasts, modals, and sidebar state
 * - filterStore: Search, filters, and pagination
 *
 * Usage example for global loading:
 * ```tsx
 * import { useUIStore, setGlobalLoading } from '@/stores/uiStore';
 *
 * function MyComponent() {
 *   const { globalLoading, loadingMessage } = useUIStore();
 *   const { setGlobalLoading } = useUIStore.getState();
 *
 *   const handleSubmit = async () => {
 *     setGlobalLoading(true, 'Submitting...');
 *     try {
 *       await apiCall();
 *     } finally {
 *       setGlobalLoading(false);
 *     }
 *   };
 * }
 * ```
 *
 * @see {@link useUIStore} - Hook to access UI state (loading, toasts, modals)
 * @see {@link GlobalLoader} - Full-screen loading overlay component
 * @see docs/LOADING-SYSTEM.md - Complete documentation
 */

/**
 * v12 结构性修复
 * ---------------------------------------------------------------
 * Next.js 16 只允许**根 layout**（src/app/layout.tsx）渲染 <html>/<body>。
 * 本文件此前又渲染了一遍 <html lang={locale}><head>…</head><body>…</body></html>，
 * SSR 出来的 DOM 是嵌套的 <html>，React 19 直接抛一个**没有消息**的 Error
 * （digest 97180869），整页 500：
 *
 *   Error:
 *       at <unknown> (.next/server/chunks/ssr/_0ym-q82le7ws5._.js:9:13654)
 *       digest: '97180869'
 *
 * 后果是 Lighthouse 拿不到 FCP（runtimeError.code = NO_FCP），
 * .lighthouseci/ 空目录 → 这条审计从来没测到过东西。
 *
 * 现在 DOM 骨架、字体、globals.css、Providers 全部归根 layout；
 * 本文件只负责 locale 相关能力：i18n 消息、导航、页脚、结构化数据。
 */

import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Locale, locales } from '@/i18n/config'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { Analytics } from '@/components/Analytics'
import { Footer } from '@/components/Footer'
import { Navigation } from '@/components/Navigation'
import { StructuredData } from '@/components/SEO'
import PerformanceOptimizer from '@/components/PerformanceOptimizer'
import type { Metadata } from 'next'

type Params = Promise<{ locale: string }>

const baseUrl = 'https://7zi.studio'

// 多语言 SEO 配置
const seoConfig = {
  zh: {
    title: '7zi Studio - AI 驱动的创新数字工作室',
    description:
      '7zi Studio 由 11 位专业 AI 代理组成，提供网站开发、品牌设计、营销推广等全方位数字化服务。高效、专业、创新。',
    keywords: [
      'AI',
      '数字工作室',
      '网站开发',
      '品牌设计',
      '营销推广',
      'SEO 优化',
      'UI/UX 设计',
      'AI 代理',
    ],
    locale: 'zh_CN',
    ogDescription: '由 11 位 AI 代理组成的创新数字工作室',
  },
  en: {
    title: '7zi Studio - AI-Powered Digital Innovation Studio',
    description:
      '7zi Studio consists of 11 professional AI agents, providing comprehensive digital services including web development, brand design, and marketing.',
    keywords: [
      'AI',
      'Digital Studio',
      'Web Development',
      'Brand Design',
      'Marketing',
      'SEO',
      'UI/UX Design',
      'AI Agents',
    ],
    locale: 'en_US',
    ogDescription: 'An innovative digital studio powered by 11 AI agents',
  },
}

// 动态生成元数据
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  const seo = seoConfig[locale as 'zh' | 'en'] || seoConfig.zh

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: seo.title,
      template: `%s | 7zi Studio`,
    },
    description: seo.description,
    keywords: seo.keywords,
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
      locale: seo.locale as 'zh_CN' | 'en_US',
      url: `${baseUrl}/${locale}`,
      siteName: '7zi Studio',
      title: seo.title,
      description: seo.ogDescription,
      images: [
        {
          url: `${baseUrl}/og-image.svg`,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.ogDescription,
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
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'zh-CN': `${baseUrl}/zh`,
        'en-US': `${baseUrl}/en`,
        'x-default': `${baseUrl}/zh`,
      },
    },
  }
}

// 禁用静态生成
// export function generateStaticParams() {
//   return routing.locales.map((locale) => ({ locale }));
// }

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Params
}>) {
  const { locale } = await params

  // 验证 locale
  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  // 设置请求 locale
  setRequestLocale(locale)

  // 获取翻译消息
  const messages = await getMessages()

  return (
    <>
      {/* Performance Optimization - Initialize Web Vitals monitoring & optimizations */}
      <PerformanceOptimizer
        debug={process.env.NODE_ENV === 'development'}
        preloadCritical={true}
        sampleRate={1.0}
      />

      <Navigation />
      <Analytics />
      <NextIntlClientProvider messages={messages}>
        {children}
        <ServiceWorkerRegistration />
        <PWAInstallPrompt />
      </NextIntlClientProvider>
      <Footer />

      {/* 结构化数据：next/script 的 strategy="afterInteractive" 必须落在 body 内，
          所以从原来手写的 head 里搬到这里。 */}
      <StructuredData locale={locale} schemas={['website', 'organization']} />
    </>
  )
}

