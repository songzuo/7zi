import Script from 'next/script'

export interface OrganizationSchemaProps {
  name?: string
  url?: string
  logo?: string
  description?: string
  sameAs?: string[]
  contactPoint?: {
    telephone?: string
    email?: string
    contactType?: string
  }
}

/**
 * Organization Schema 结构化数据
 */
export function OrganizationSchema({
  name = '7zi Studio',
  url = 'https://7zi.com',
  logo = 'https://7zi.com/icon-512.png',
  description = '现代化任务管理与协作平台',
  sameAs = [],
  contactPoint = {},
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    description,
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      ...contactPoint,
    },
  }

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
