import Script from 'next/script'

export interface BreadcrumbItem {
  name: string
  nameEn?: string
  path: string
}

export interface BreadcrumbSchemaProps {
  breadcrumbs: BreadcrumbItem[]
  baseUrl?: string
  locale?: 'zh' | 'en'
}

/**
 * Breadcrumb Schema 结构化数据
 */
export function BreadcrumbSchema({
  breadcrumbs,
  baseUrl = 'https://7zi.com',
  locale = 'zh',
}: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => {
      const itemName = locale === 'en' && item.nameEn ? item.nameEn : item.name

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: itemName,
        item: `${baseUrl}${item.path}`,
      }
    }),
  }

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
