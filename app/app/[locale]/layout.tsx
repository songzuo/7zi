import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { Navigation } from '../../components/Navigation';
import { ThemeProvider } from '../../components/ThemeProvider';
import { GlobalErrorHandler } from '../../components/GlobalErrorHandler';
import ErrorBoundary from '../../components/ErrorBoundary';
import { QueryProvider } from '../../lib/query';
import { locales, type Locale } from '../../i18n/config';

// 生成静态参数
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://7zi.com'),
  title: {
    default: 'AI 团队实时看板 - 宋琢环球旅行 | 智能团队协作管理平台',
    template: '%s | AI 团队实时看板',
  },
  description:
    'AI 团队实时看板 - 由宋琢环球旅行团队打造的专业智能团队协作管理平台。实时监控 11 个专业 AI 代理工作状态、GitHub 任务进度、活动日志。支持任务分配、进度追踪、团队协作。提升团队效率 300%。',
  keywords: [
    'AI团队看板',
    '任务管理',
    '智能体',
    'AI代理',
    '团队协作',
    '宋琢环球旅行',
    '团队管理平台',
    'AI管理系统',
    'GitHub集成',
    '实时看板',
    '团队监控',
    '任务追踪',
    '团队效率工具',
    'AI团队协作',
    '智能团队管理',
  ],
  authors: [{ name: '宋琢环球旅行', url: 'https://7zi.com' }],
  creator: '宋琢环球旅行',
  publisher: '宋琢环球旅行',
  applicationName: 'AI 团队实时看板',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  category: 'BusinessApplication',
  classification: 'AI Team Management Platform',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI 团队看板',
    startupImage: '/apple-splash.png',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US', 'zh_TW'],
    url: 'https://7zi.com',
    siteName: 'AI 团队实时看板',
    title: 'AI 团队实时看板 - 智能团队协作管理平台 | 宋琢环球旅行',
    description: '实时监控 11 个专业 AI 代理工作状态、GitHub 任务进度、活动日志。提升团队效率 300%。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI 团队实时看板 - 智能团队协作管理平台',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@songzhuo_travel',
    creator: '@songzhuo_travel',
    title: 'AI 团队实时看板 - 智能团队协作管理平台',
    description: '实时监控 11 个专业 AI 代理工作状态、GitHub 任务进度、活动日志。提升团队效率 300%。',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://7zi.com',
    languages: {
      'zh-CN': 'https://7zi.com',
      'en-US': 'https://7zi.com/en',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // 验证 locale
  if (!locales.includes(locale as Locale)) {
    // 如果无效 locale，使用默认语言
    return null;
  }

  // 设置请求 locale
  setRequestLocale(locale);

  // 获取翻译消息
  const messages = await getMessages();

  // 结构化数据
  const jsonLdWebApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: locale === 'en' ? 'AI Team Dashboard' : 'AI 团队实时看板',
    description: locale === 'en' 
      ? 'Real-time monitoring of 11 professional AI agents, task progress, and activity logs'
      : '实时展示 AI 团队成员状态、任务进度和活动日志',
    url: 'https://7zi.com',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    softwareVersion: '1.0.0',
    author: {
      '@type': 'Organization',
      name: '宋琢环球旅行',
      url: 'https://7zi.com',
    },
  };

  const jsonLdOrganization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '宋琢环球旅行',
    url: 'https://7zi.com',
    logo: 'https://7zi.com/logo.png',
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var resolved = theme;
                  if (!theme || theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (resolved === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="dns-prefetch" href="//api.dicebear.com" />
        <link rel="dns-prefetch" href="//avatars.githubusercontent.com" />
        <link rel="dns-prefetch" href="//github.com" />
        <link rel="dns-prefetch" href="//api.github.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="/favicon.ico" as="image" />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebApp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          {locale === 'en' ? 'Skip to main content' : '跳到主要内容'}
        </a>
        
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <ThemeProvider>
              <GlobalErrorHandler>
                <Navigation />
                <main id="main-content" tabIndex={-1} className="outline-none">
                  <ErrorBoundary name="LocaleLayout">
                    {children}
                  </ErrorBoundary>
                </main>
              </GlobalErrorHandler>
            </ThemeProvider>
          </QueryProvider>
        </NextIntlClientProvider>
        
        <footer className="sr-only" aria-label="网站信息">
          {locale === 'en' 
            ? 'AI Team Dashboard - Managed by Songzhuo Global Travel Team'
            : 'AI 团队实时看板 - 由宋琢环球旅行团队管理'}
        </footer>
      </body>
    </html>
  );
}
