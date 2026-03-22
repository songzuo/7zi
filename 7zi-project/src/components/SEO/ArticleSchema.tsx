import Script from 'next/script'

export interface ArticleSchemaProps {
  headline: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  author: string
  authorUrl?: string
  publisher?: {
    name: string
    logo: string
  }
  image?: string
  tags?: string[]
  category?: string
  wordCount?: number
}

/**
 * Article Schema 结构化数据
 */
export function ArticleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  author,
  authorUrl,
  publisher = {
    name: '7zi Studio',
    logo: 'https://7zi.com/icon-512.png',
  },
  image,
  tags = [],
  category,
  wordCount,
}: ArticleSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image: image || 'https://7zi.com/opengraph-image.png',
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: author,
      ...(authorUrl && { url: authorUrl }),
    },
    publisher: {
      '@type': 'Organization',
      name: publisher.name,
      logo: {
        '@type': 'ImageObject',
        url: publisher.logo,
      },
    },
    ...(tags.length > 0 && { keywords: tags.join(', ') }),
    ...(category && { articleSection: category }),
    ...(wordCount && { wordCount }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  }

  return (
    <Script
      id="article-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
