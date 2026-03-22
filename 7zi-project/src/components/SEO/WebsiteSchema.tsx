import Script from 'next/script'

export interface WebsiteSchemaProps {
  name?: string
  url?: string
  description?: string
  alternateName?: string[]
  search?: {
    target: string
    'query-input': string
  }
}

/**
 * Website Schema 结构化数据
 */
export function WebsiteSchema({
  name = '7zi-Frontend',
  url = 'https://7zi.com',
  description = '现代化任务管理与协作平台',
  alternateName = [],
  search,
}: WebsiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    description,
    alternateName,
    ...(search && {
      potentialAction: {
        '@type': 'SearchAction',
        target: search.target,
        'query-input': search['query-input'],
      },
    }),
  }

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
