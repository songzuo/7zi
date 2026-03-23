/**
 * SEO 组件 - 支持多语言的 SEO 优化
 * 包含 JSON-LD 结构化数据
 *
 * 注意：Next.js 16 自动为 <Script> 组件添加 CSP nonce
 * 不需要手动传递 nonce 属性
 */


import { useMemo } from 'react';
import { generateOrganizationSchema, generateWebSiteSchema, generateBreadcrumbSchema, generateFAQSchema } from '@/lib/seo-metadata';

interface SEOProps {
  locale?: 'zh' | 'en';
  schemas?: Array<'website' | 'organization' | 'breadcrumb' | 'faq'>;
  customSchemas?: Array<Record<string, unknown>>;
  breadcrumbs?: Array<{ name: string; nameEn: string; path: string }>;
  faqs?: Array<{ question: string; questionEn?: string; answer: string; answerEn?: string }>;
}

// JSON-LD 结构化数据组件
export function StructuredData({
  locale = 'zh',
  schemas = ['website', 'organization'],
  customSchemas = [],
  breadcrumbs,
  faqs,
}: SEOProps) {
  // Memoize schemaList to prevent recreation on every render
  const schemaList = useMemo(() => {
    const list: Array<Record<string, unknown>> = [];

    // 添加默认 schemas
    if (schemas.includes('website')) {
      list.push(generateWebSiteSchema(locale));
    }

    if (schemas.includes('organization')) {
      list.push(generateOrganizationSchema(locale));
    }

    if (schemas.includes('breadcrumb') && breadcrumbs && breadcrumbs.length > 0) {
      list.push(generateBreadcrumbSchema(breadcrumbs, locale));
    }

    if (schemas.includes('faq') && faqs && faqs.length > 0) {
      list.push(generateFAQSchema(faqs, locale));
    }

    // 添加自定义 schemas
    list.push(...customSchemas);

    return list;
  }, [locale, schemas, breadcrumbs, faqs, customSchemas]);

  // Memoize schema JSON string to prevent recreation
  const schemaJson = useMemo(() => {
    if (schemaList.length === 1) {
      return JSON.stringify(schemaList[0]);
    }

    // 多个 schemas 使用 @graph
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': schemaList,
    });
  }, [schemaList]);

  return (
    <Script
      id="structured-data"
      strategy="afterInteractive"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: schemaJson,
      }}
    />
  );
}

// 文章结构化数据
interface ArticleSchemaProps {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  image?: string;
  tags?: string[];
  category?: string;
  wordCount?: number;
  locale?: 'zh' | 'en';
}

export function ArticleSchema({
  title,
  description,
  url,
  datePublished,
  dateModified,
  author,
  image,
  tags,
  category,
  wordCount,
}: ArticleSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';

  // Memoize schema object to prevent recreation on every render
  const schema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: '7zi Studio',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    image: image || `${baseUrl}/og-image.png`,
    articleSection: category,
    keywords: tags?.join(', '),
    wordCount,
  }), [title, description, url, datePublished, dateModified, author, image, tags, category, wordCount, baseUrl]);

  // Memoize schema JSON string
  const schemaJson = useMemo(() => JSON.stringify(schema), [schema]);

  return (
    <Script
      id="article-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: schemaJson,
      }}
    />
  );
}

// 服务结构化数据
interface ServiceSchemaProps {
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  url: string;
  provider?: string;
  locale?: 'zh' | 'en';
}

export function ServiceSchema({
  name,
  nameEn,
  description,
  descriptionEn,
  url,
  provider,
  locale = 'zh',
}: ServiceSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';

  // Memoize schema object to prevent recreation on every render
  const schema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: locale === 'zh' ? name : (nameEn || name),
    description: locale === 'zh' ? description : (descriptionEn || description),
    url,
    provider: {
      '@type': 'Organization',
      name: provider || '7zi Studio',
      url: baseUrl,
    },
    areaServed: {
      '@type': 'Country',
      name: locale === 'zh' ? 'China' : 'Worldwide',
    },
  }), [name, nameEn, description, descriptionEn, url, provider, locale, baseUrl]);

  // Memoize schema JSON string
  const schemaJson = useMemo(() => JSON.stringify(schema), [schema]);

  return (
    <Script
      id="service-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: schemaJson,
      }}
    />
  );
}

// 产品结构化数据
interface ProductSchemaProps {
  name: string;
  description: string;
  image?: string;
  brand?: string;
  price?: string;
  priceCurrency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
}

export function ProductSchema({
  name,
  description,
  image,
  brand = '7zi Studio',
  price,
  priceCurrency = 'CNY',
  availability = 'InStock',
}: ProductSchemaProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';

  // Memoize schema object to prevent recreation on every render
  const schema = useMemo(() => {
    const baseSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      brand: {
        '@type': 'Brand',
        name: brand,
      },
      image: image || `${baseUrl}/og-image.png`,
    };

    if (price) {
      baseSchema.offers = {
        '@type': 'Offer',
        price,
        priceCurrency,
        availability: `https://schema.org/${availability}`,
      };
    }

    return baseSchema;
  }, [name, description, image, brand, price, priceCurrency, availability, baseUrl]);

  // Memoize schema JSON string
  const schemaJson = useMemo(() => JSON.stringify(schema), [schema]);

  return (
    <Script
      id="product-schema"
      strategy="afterInteractive"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: schemaJson,
      }}
    />
  );
}

// 面包屑组件
interface BreadcrumbItem {
  name: string;
  nameEn: string;
  path: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  locale?: 'zh' | 'en';
}

export function Breadcrumbs({ items, locale = 'zh' }: BreadcrumbsProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';

  // Memoize baseUrl to prevent string recreation on every render
  const baseUrlMemo = useMemo(() => baseUrl, [baseUrl]);
  
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex items-center gap-2 flex-wrap">
        {items.map((item, index) => (
          <li key={item.path} className="flex items-center gap-2">
            {index > 0 && <span className="text-zinc-400">/</span>}
            {index === items.length - 1 ? (
              <span className="text-zinc-500 dark:text-zinc-400" aria-current="page">
                {locale === 'zh' ? item.name : item.nameEn}
              </span>
            ) : (
              <a
                href={`${baseUrl}/${locale}${item.path}`}
                className="text-cyan-500 hover:text-cyan-600 transition-colors"
              >
                {locale === 'zh' ? item.name : item.nameEn}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Canonical URL 组件
interface CanonicalUrlProps {
  path: string;
  locale?: 'zh' | 'en';
}

export function CanonicalUrl({ path, locale = 'zh' }: CanonicalUrlProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';

  // Memoize canonical URL to prevent string recreation on every render
  const canonicalUrl = useMemo(() => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}/${locale}${cleanPath}`;
  }, [baseUrl, locale, path]);

  return (
    <link
      rel="canonical"
      href={canonicalUrl}
    />
  );
}

// Hreflang 标签组件
interface HreflangLinksProps {
  path: string;
}

export function HreflangLinks({ path }: HreflangLinksProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';

  // Memoize cleanPath to prevent string recreation
  const cleanPath = useMemo(() => {
    return path.startsWith('/') ? path : `/${path}`;
  }, [path]);

  // Memoize hreflang URLs to prevent array recreation
  const hreflangLinks = useMemo(() => [
    <link key="zh-CN" rel="alternate" hrefLang="zh-CN" href={`${baseUrl}/zh${cleanPath}`} />,
    <link key="en-US" rel="alternate" hrefLang="en-US" href={`${baseUrl}/en${cleanPath}`} />,
    <link key="x-default" rel="alternate" hrefLang="x-default" href={`${baseUrl}/zh${cleanPath}`} />,
  ], [baseUrl, cleanPath]);

  return <>{hreflangLinks}</>;
}

export default StructuredData;