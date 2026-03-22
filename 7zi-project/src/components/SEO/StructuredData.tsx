import Script from 'next/script'

export type SchemaType = 'website' | 'organization' | 'article' | 'breadcrumb' | 'product' | 'service'

export interface StructuredDataProps {
  schemaType: SchemaType
  schema: Record<string, unknown>
  id?: string
}

/**
 * 通用结构化数据组件
 */
export function StructuredData({ schemaType, schema, id = `${schemaType}-schema` }: StructuredDataProps) {
  const fullSchema = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    ...schema,
  }

  return (
    <Script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(fullSchema) }}
    />
  )
}
