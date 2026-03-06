import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { Navigation } from '../components/Navigation';
import { ThemeProvider } from '../components/ThemeProvider';
import { GlobalErrorHandler } from '../components/GlobalErrorHandler';
import ErrorBoundary from '../components/ErrorBoundary';
import { QueryProvider } from '../lib/query';

// 使用 next/font 优化 - 自动优化字体加载
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // 防止字体加载时闪烁
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
  // 可访问性元数据
  category: 'BusinessApplication',
  classification: 'AI Team Management Platform',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI 团队看板',
    startupImage: '/apple-splash.png',
  },
  // 打开 Graph - 优化社交分享
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
      {
        url: '/og-image-square.png',
        width: 800,
        height: 800,
        alt: 'AI 团队实时看板 Logo',
        type: 'image/png',
      },
    ],
  },
  // Twitter - 优化 Twitter 卡片
  twitter: {
    card: 'summary_large_image',
    site: '@songzhuo_travel',
    creator: '@songzhuo_travel',
    title: 'AI 团队实时看板 - 智能团队协作管理平台',
    description: '实时监控 11 个专业 AI 代理工作状态、GitHub 任务进度、活动日志。提升团队效率 300%。',
    images: ['/og-image.png'],
  },
  // 搜索引擎优化
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
  // 验证（需要替换为真实验证码）
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
  },
  // 其他 SEO 元数据
  alternates: {
    canonical: 'https://7zi.com',
    languages: {
      'zh-CN': 'https://7zi.com',
      'en-US': 'https://7zi.com/en',
    },
  },
  bookmarks: ['https://7zi.com/dashboard', 'https://7zi.com/tasks'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 结构化数据 - 多种类型
  const jsonLdWebApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'AI 团队实时看板',
    description: '实时展示 AI 团队成员状态、任务进度和活动日志',
    url: 'https://7zi.com',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    softwareVersion: '1.0.0',
    author: {
      '@type': 'Organization',
      name: '宋琢环球旅行',
      url: 'https://7zi.com',
    },
    creator: {
      '@type': 'Organization',
      name: '宋琢环球旅行',
      url: 'https://7zi.com',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '128',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      '实时成员状态展示',
      '任务进度追踪',
      '活动日志记录',
      '11个专业AI代理协同',
      'GitHub任务集成',
      '响应式设计',
      '深色模式支持',
    ],
    screenshot: 'https://7zi.com/screenshot.png',
  };

  const jsonLdOrganization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '宋琢环球旅行',
    url: 'https://7zi.com',
    logo: 'https://7zi.com/logo.png',
    sameAs: [
      'https://twitter.com/songzhuo_travel',
      'https://github.com/songzhuo',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['Chinese', 'English'],
    },
  };

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '首页',
        item: 'https://7zi.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '仪表盘',
        item: 'https://7zi.com/dashboard',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: '任务列表',
        item: 'https://7zi.com/tasks',
      },
    ],
  };

  const jsonLdFAQ = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '什么是 AI 团队实时看板？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI 团队实时看板是一个专业的智能团队协作管理平台，可以实时监控 11 个专业 AI 代理的工作状态、任务进度和活动日志，支持 GitHub 任务集成和团队协作。',
        },
      },
      {
        '@type': 'Question',
        name: '如何使用 AI 团队实时看板？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '只需访问 7zi.com，即可查看团队状态、管理任务、追踪进度。系统支持自动刷新和实时更新，无需复杂配置。',
        },
      },
      {
        '@type': 'Question',
        name: 'AI 团队实时看板有哪些功能？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '主要功能包括：实时成员状态展示、任务进度追踪、活动日志记录、11个专业AI代理协同、GitHub任务集成、响应式设计、深色模式支持等。',
        },
      },
    ],
  };

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 主题脚本 - 防止闪烁 */}
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
        {/* 性能优化：DNS 预取和预连接 */}
        <link rel="dns-prefetch" href="//api.dicebear.com" />
        <link rel="dns-prefetch" href="//avatars.githubusercontent.com" />
        <link rel="dns-prefetch" href="//github.com" />
        <link rel="dns-prefetch" href="//api.github.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.dicebear.com" />
        <link rel="preconnect" href="https://avatars.githubusercontent.com" />
        
        {/* 预加载关键资源 */}
        <link rel="preload" href="/favicon.ico" as="image" />
        
        {/* 结构化数据 - JSON-LD (多种类型) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebApp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }}
        />
        
        {/* 性能监控 (仅生产环境) */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // 性能监控
                window.addEventListener('error', function(e) {
                  if (window.navigator.sendBeacon) {
                    var payload = JSON.stringify({
                      type: 'error',
                      message: e.message,
                      url: window.location.href,
                      timestamp: new Date().toISOString()
                    });
                    window.navigator.sendBeacon('/api/metrics', payload);
                  }
                });
                
                // Core Web Vitals 监控
                if ('PerformanceObserver' in window) {
                  new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.entryType === ' LargestContentfulPaint') {
                        console.log('LCP:', entry.startTime);
                      }
                    }
                  }).observe({ entryTypes: ['largest-contentful-paint'] });
                  
                  new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.entryType === 'First Input') {
                        console.log('FID:', entry.processingStart - entry.startTime);
                      }
                    }
                  }).observe({ entryTypes: ['first-input'] });
                }
              `,
            }}
          />
        )}
      </head>
      <body className={`${inter.className} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors`}>
        {/* 跳过导航链接 - 屏幕阅读器专用 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          跳到主要内容
        </a>
        
        <QueryProvider>
          <ThemeProvider>
            {/* 全局错误处理 */}
            <GlobalErrorHandler>
              {/* 导航组件 */}
              <Navigation />
              
              {/* 主内容区域 - 包含错误边界 */}
              <main id="main-content" tabIndex={-1} className="outline-none">
                <ErrorBoundary name="RootLayout">
                  {children}
                </ErrorBoundary>
              </main>
            </GlobalErrorHandler>
          </ThemeProvider>
        </QueryProvider>
        
        {/* 页脚信息 */}
        <footer className="sr-only" aria-label="网站信息">
          AI 团队实时看板 - 由宋琢环球旅行团队管理
        </footer>
      </body>
    </html>
  );
}
