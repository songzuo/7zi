/**
 * 结构化数据 JSON-LD 组件
 * 支持 Organization, WebSite, BreadcrumbList, SoftwareApplication
 */

interface OrganizationJsonLdProps {
  name: string
  url: string
  logo?: string
  description?: string
}

export function OrganizationJsonLd({ name, url, logo, description }: OrganizationJsonLdProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
  }

  if (logo) {
    data.logo = logo.startsWith('http') ? logo : `${url}${logo}`
  }
  if (description) {
    data.description = description
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

interface WebSiteJsonLdProps {
  name: string
  url: string
  description?: string
  potentialAction?: {
    target: string | string[]
    queryInput?: string
  }
}

export function WebSiteJsonLd({ name, url, description, potentialAction }: WebSiteJsonLdProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
  }

  if (description) {
    data.description = description
  }

  if (potentialAction) {
    data.potentialAction = {
      '@type': 'SearchAction',
      target: potentialAction.target,
      'query-input': potentialAction.queryInput || 'required name=search_term_string',
    }
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

interface BreadcrumbJsonLdProps {
  items: Array<{
    name: string
    url: string
  }>
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

interface SoftwareApplicationJsonLdProps {
  name: string
  description: string
  url: string
  applicationCategory?: string
  operatingSystem?: string
  offers?: {
    price: string
    priceCurrency: string
  }
}

export function SoftwareApplicationJsonLd({
  name,
  description,
  url,
  applicationCategory = 'DeveloperApplication',
  operatingSystem = 'Any',
  offers = { price: '0', priceCurrency: 'USD' },
}: SoftwareApplicationJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory,
    operatingSystem,
    offers: {
      '@type': 'Offer',
      price: offers.price,
      priceCurrency: offers.priceCurrency,
    },
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
