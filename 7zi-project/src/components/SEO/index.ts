/**
 * SEO 组件库
 *
 * 提供完整的 SEO 优化组件，包括：
 * - Metadata 生成工具
 * - 结构化数据组件
 * - 社交媒体分享优化
 */

export { generateBaseMetadata } from './utils'
export { OrganizationSchema } from './OrganizationSchema'
export { WebsiteSchema } from './WebsiteSchema'
export { ArticleSchema } from './ArticleSchema'
export { BreadcrumbSchema } from './BreadcrumbSchema'
export { StructuredData } from './StructuredData'

export type { SEOConfig } from './utils'
export type { OrganizationSchemaProps } from './OrganizationSchema'
export type { WebsiteSchemaProps } from './WebsiteSchema'
export type { ArticleSchemaProps } from './ArticleSchema'
export type { BreadcrumbItem, BreadcrumbSchemaProps } from './BreadcrumbSchema'
export type { StructuredDataProps, SchemaType } from './StructuredData'
