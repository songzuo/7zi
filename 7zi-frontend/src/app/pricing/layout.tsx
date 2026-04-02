import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '定价方案 - 7zi | Pricing Plans - Choose Your Perfect Plan',
  description:
    '选择适合您的 7zi 定价方案。免费版适合个人用户，专业版适合团队，企业版满足大型组织需求。包含中英文双语支持和 30 天退款保证。',
  keywords: [
    '7zi 定价',
    'pricing plans',
    'subscription',
    'SaaS pricing',
    'team collaboration',
    '免费版',
    '专业版',
    '企业版',
    'Pro plan',
    'Enterprise plan',
    '定价对比',
    'feature comparison',
  ],
  openGraph: {
    title: '定价方案 - 7zi | Pricing Plans',
    description: '灵活的定价方案，满足个人和团队的各种需求。30 天退款保证。',
    type: 'website',
    url: 'https://7zi.studio/pricing',
    images: [
      {
        url: '/images/og-pricing.jpg',
        width: 1200,
        height: 630,
        alt: '7zi Pricing Plans',
      },
    ],
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '定价方案 - 7zi | Pricing Plans',
    description: '灵活的定价方案，满足个人和团队的各种需求',
    images: ['/images/twitter-pricing.jpg'],
  },
  alternates: {
    canonical: 'https://7zi.studio/pricing',
    languages: {
      'zh-CN': 'https://7zi.studio/pricing?lang=zh',
      'en-US': 'https://7zi.studio/pricing?lang=en',
    },
  },
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
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
