import { Metadata } from 'next'

export interface SEOConfig {
  title: string
  description: string
  keywords?: string[]
  locale?: 'zh' | 'en'
  canonical?: string
  ogImage?: string
  twitterCard?: 'summary' | 'summary_large_image'
}

/**
 * 生成基础的 SEO metadata
 */
export function generateBaseMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords,
    locale = 'zh',
    canonical,
    ogImage = '/opengraph-image.png',
    twitterCard = 'summary_large_image',
  } = config

  const baseUrl = 'https://7zi.com'
  const fullCanonical = canonical || `${baseUrl}/${locale}`
  const localeCode = locale === 'zh' ? 'zh-CN' : 'en-US'

  return {
    title,
    description,
    keywords: keywords?.join(', '),
    authors: [{ name: '7zi Studio' }],
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
      locale: localeCode,
      alternateLocale: locale === 'zh' ? 'en_US' : 'zh_CN',
      url: fullCanonical,
      siteName: '7zi-Frontend',
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: twitterCard,
      title,
      description,
      images: ['/twitter-image.png'],
    },
    alternates: {
      canonical: fullCanonical,
      languages: {
        'zh-CN': `${baseUrl}/zh`,
        'en-US': `${baseUrl}/en`,
        'x-default': `${baseUrl}/zh`,
      },
    },
    verification: {
      google: 'your-google-verification-code',
    },
  }
}
