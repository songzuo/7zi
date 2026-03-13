/**
 * SEO 工具函数
 * 用于生成结构化数据和 meta 信息
 */

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';

// 网站基本信息
export const siteConfig = {
  name: '7zi Studio',
  url: baseUrl,
  ogImage: `${baseUrl}/og-image.png`,
  logo: `${baseUrl}/logo.png`,
  twitterHandle: '@7zistudio',
  email: 'business@7zi.studio',
  description: '由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务',
  keywords: ['AI', '数字工作室', '网站开发', '品牌设计', '营销推广', 'SEO 优化', 'UI/UX 设计', 'AI 代理', '数字化解决方案'],
  language: 'zh-CN',
  locale: 'zh_CN',
};

// 组织结构化数据
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: siteConfig.logo,
    description: siteConfig.description,
    foundingDate: '2024',
    founders: [
      {
        '@type': 'Person',
        name: '宋琢环球旅行',
      },
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: siteConfig.email,
      availableLanguage: ['Chinese', 'English'],
    },
    sameAs: [
      'https://github.com/7zi-studio',
      'https://twitter.com/7zistudio',
      'https://linkedin.com/company/7zistudio',
    ],
  };
}

// 网站结构化数据
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/blog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// 面包屑结构化数据
export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// 博客文章结构化数据
export function getBlogPostSchema(post: {
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
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: post.url,
    datePublished: post.datePublished,
    dateModified: post.dateModified || post.datePublished,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        '@type': 'ImageObject',
        url: siteConfig.logo,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': post.url,
    },
    image: post.image || siteConfig.ogImage,
    articleSection: post.category,
    keywords: post.tags?.join(', '),
    wordCount: post.wordCount,
  };
}

// 产品/服务结构化数据
export function getServiceSchema(service: {
  name: string;
  description: string;
  url: string;
  provider?: string;
  areaServed?: string;
  offers?: {
    price: string;
    priceCurrency: string;
  };
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    url: service.url,
    provider: {
      '@type': 'Organization',
      name: service.provider || siteConfig.name,
    },
    areaServed: {
      '@type': 'Country',
      name: service.areaServed || 'China',
    },
    ...(service.offers && {
      offers: {
        '@type': 'Offer',
        price: service.offers.price,
        priceCurrency: service.offers.priceCurrency,
      },
    }),
  };
}

// FAQ 结构化数据
export function getFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// 本地业务结构化数据
export function getLocalBusinessSchema(business: {
  name?: string;
  description?: string;
  address?: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  telephone?: string;
  openingHours?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: business.name || siteConfig.name,
    description: business.description || siteConfig.description,
    url: siteConfig.url,
    ...(business.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: business.address.street,
        addressLocality: business.address.city,
        addressRegion: business.address.region,
        postalCode: business.address.postalCode,
        addressCountry: business.address.country,
      },
    }),
    telephone: business.telephone,
    openingHours: business.openingHours,
    priceRange: '$$',
  };
}

// 生成规范的 URL
export function getCanonicalUrl(path: string = '') {
  // 空路径返回基础 URL
  if (!path || path === '') {
    return siteConfig.url;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteConfig.url}${cleanPath}`;
}

// 生成 Open Graph 图片 URL
export function getOGImageUrl(options?: {
  title?: string;
  description?: string;
  image?: string;
}) {
  if (options?.image) {
    return options.image;
  }
  
  // 如果有自定义标题，使用动态 OG 图片 API
  if (options?.title) {
    const params = new URLSearchParams({
      title: options.title,
      description: options.description || siteConfig.description,
    });
    return `${baseUrl}/api/og?${params.toString()}`;
  }
  
  return siteConfig.ogImage;
}

// 社交媒体链接
export const socialLinks = {
  github: 'https://github.com/7zi-studio',
  twitter: 'https://twitter.com/7zistudio',
  linkedin: 'https://linkedin.com/company/7zistudio',
  email: `mailto:${siteConfig.email}`,
};

// 导航链接
export const navLinks = [
  { name: '首页', href: '/' },
  { name: '关于我们', href: '/about' },
  { name: '团队成员', href: '/team' },
  { name: '博客', href: '/blog' },
  { name: '联系我们', href: '/contact' },
];
