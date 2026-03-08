/**
 * SEO 元数据生成器
 * 支持多语言的 SEO 配置生成
 */

import type { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';

// 有效的 locale 类型
type ValidLocale = 'zh' | 'en';

// 验证并规范化 locale
function normalizeLocale(locale: string | undefined | null): ValidLocale {
  if (locale === 'en') return 'en';
  return 'zh'; // 默认中文
}

// 多语言 SEO 配置
export const seoConfig: Record<ValidLocale, {
  siteName: string;
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  locale: string;
}> = {
  zh: {
    siteName: '7zi Studio',
    title: '7zi Studio - AI 驱动的创新数字工作室',
    description: '7zi Studio 由 11 位专业 AI 代理组成，提供网站开发、品牌设计、营销推广等全方位数字化服务。高效、专业、创新。',
    keywords: ['AI', '数字工作室', '网站开发', '品牌设计', '营销推广', 'SEO 优化', 'UI/UX 设计', 'AI 代理', '数字化解决方案'],
    ogImage: `${baseUrl}/og-image.png`,
    locale: 'zh_CN',
  },
  en: {
    siteName: '7zi Studio',
    title: '7zi Studio - AI-Powered Digital Innovation Studio',
    description: '7zi Studio consists of 11 professional AI agents, providing comprehensive digital services including web development, brand design, and marketing. Efficient, professional, innovative.',
    keywords: ['AI', 'Digital Studio', 'Web Development', 'Brand Design', 'Marketing', 'SEO', 'UI/UX Design', 'AI Agents', 'Digital Solutions'],
    ogImage: `${baseUrl}/og-image.png`,
    locale: 'en_US',
  },
};

// 页面 SEO 配置类型
interface PageSeoConfig {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  keywords?: string[];
  keywordsEn?: string[];
  path: string;
  ogImage?: string;
}

// 页面特定 SEO 配置
export const pageSeoConfigs: Record<string, PageSeoConfig> = {
  home: {
    title: '首页 - AI 驱动的创新数字工作室',
    titleEn: 'Home - AI-Powered Digital Innovation Studio',
    description: '7zi Studio 由 11 位专业 AI 代理组成，提供网站开发、品牌设计、营销推广等全方位数字化服务。',
    descriptionEn: '7zi Studio consists of 11 professional AI agents, providing comprehensive digital services.',
    keywords: ['AI 数字工作室', '网站开发', '品牌设计', '数字化服务'],
    keywordsEn: ['AI Digital Studio', 'Web Development', 'Brand Design', 'Digital Services'],
    path: '',
  },
  about: {
    title: '关于我们 - AI 驱动的创新数字工作室',
    titleEn: 'About Us - AI-Powered Digital Innovation Studio',
    description: '了解 7zi Studio 团队 - 由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务。',
    descriptionEn: 'Learn about 7zi Studio - An innovative digital studio powered by 11 AI agents.',
    keywords: ['关于 7zi Studio', 'AI 团队', '数字工作室'],
    keywordsEn: ['About 7zi Studio', 'AI Team', 'Digital Studio'],
    path: '/about',
  },
  team: {
    title: '团队成员 - 11 位 AI 专家团队',
    titleEn: 'Our Team - 11 AI Expert Agents',
    description: '7zi Studio 团队成员介绍 - 11 位专业的 AI 代理，从战略规划到执行落地，为您提供全方位的数字化服务。',
    descriptionEn: 'Meet our 11 professional AI agents, providing comprehensive digital services.',
    keywords: ['AI 团队', '团队成员', 'AI 代理', '数字工作室团队'],
    keywordsEn: ['AI Team', 'Team Members', 'AI Agents', 'Digital Studio Team'],
    path: '/team',
  },
  blog: {
    title: '博客 - AI 与数字化前沿洞察',
    titleEn: 'Blog - AI & Digital Insights',
    description: '7zi Studio 博客 - 分享 AI、数字化、Web 开发、设计、营销的最新见解和深度分析。',
    descriptionEn: '7zi Studio Blog - Sharing insights on AI, digital transformation, and innovation.',
    keywords: ['AI 博客', '数字化趋势', 'Web 开发', '技术博客'],
    keywordsEn: ['AI Blog', 'Digital Trends', 'Web Development', 'Tech Blog'],
    path: '/blog',
  },
  contact: {
    title: '联系我们 - 获取专业数字化服务',
    titleEn: 'Contact Us - Get Professional Digital Services',
    description: '联系 7zi Studio - AI 驱动的创新数字工作室。商务合作、技术支持、项目咨询，我们 24 小时内回复。',
    descriptionEn: 'Contact 7zi Studio - AI-powered digital innovation studio. We respond within 24 hours.',
    keywords: ['联系 7zi Studio', '商务合作', '项目咨询'],
    keywordsEn: ['Contact 7zi Studio', 'Business Cooperation', 'Project Consultation'],
    path: '/contact',
  },
  dashboard: {
    title: '项目仪表盘 - 查看项目进度',
    titleEn: 'Dashboard - Project Progress Overview',
    description: '7zi Studio 项目仪表盘 - 实时查看项目进度、团队动态和关键数据。',
    descriptionEn: '7zi Studio Dashboard - Real-time project progress and team activities.',
    keywords: ['项目仪表盘', '项目进度', '团队动态'],
    keywordsEn: ['Project Dashboard', 'Project Progress', 'Team Activities'],
    path: '/dashboard',
  },
};

// 生成多语言 Metadata
export function generatePageMetadata(
  pageKey: string,
  locale?: string | null
): Metadata {
  // 防御性代码：规范化 locale，确保始终是有效值
  const normalizedLocale: ValidLocale = normalizeLocale(locale);
  const seo = seoConfig[normalizedLocale];
  const config = pageSeoConfigs[pageKey];
  
  // 如果页面配置不存在，返回默认 SEO
  if (!config) {
    return {
      title: seo.title,
      description: seo.description,
    };
  }

  const title = normalizedLocale === 'zh' ? config.title : config.titleEn;
  const description = normalizedLocale === 'zh' ? config.description : config.descriptionEn;
  const keywords = normalizedLocale === 'zh' ? config.keywords : config.keywordsEn;
  const url = `${baseUrl}/${normalizedLocale}${config.path}`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url,
      siteName: seo.siteName,
      locale: seo.locale as 'zh_CN' | 'en_US',
      type: 'website',
      images: [
        {
          url: config.ogImage || seo.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [config.ogImage || seo.ogImage],
      creator: '@7zistudio',
      site: '@7zistudio',
    },
    alternates: {
      canonical: url,
      languages: {
        'zh-CN': `${baseUrl}/zh${config.path}`,
        'en-US': `${baseUrl}/en${config.path}`,
      },
    },
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
  };
}

// 生成 hreflang 标签
export function generateHreflangLinks(path: string = ''): Array<{ hreflang: string; href: string }> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return [
    { hreflang: 'zh-CN', href: `${baseUrl}/zh${cleanPath}` },
    { hreflang: 'en-US', href: `${baseUrl}/en${cleanPath}` },
    { hreflang: 'x-default', href: `${baseUrl}/zh${cleanPath}` },
  ];
}

// WebSite Schema 生成器
export function generateWebSiteSchema(locale?: string | null) {
  const normalizedLocale: ValidLocale = normalizeLocale(locale);
  const seo = seoConfig[normalizedLocale];
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: seo.siteName,
    url: baseUrl,
    description: seo.description,
    inLanguage: normalizedLocale === 'zh' ? 'zh-CN' : 'en-US',
    publisher: {
      '@type': 'Organization',
      name: seo.siteName,
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/${normalizedLocale}/blog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// Organization Schema 生成器
export function generateOrganizationSchema(locale?: string | null) {
  const normalizedLocale: ValidLocale = normalizeLocale(locale);
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '7zi Studio',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: normalizedLocale === 'zh' 
      ? '由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务'
      : 'An innovative digital studio powered by 11 AI agents, providing comprehensive digital services',
    foundingDate: '2024',
    founders: [
      {
        '@type': 'Person',
        name: normalizedLocale === 'zh' ? '宋琢环球旅行' : 'Song Zhuo Global Travel',
      },
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'business@7zi.studio',
      availableLanguage: ['Chinese', 'English'],
    },
    sameAs: [
      'https://github.com/7zi-studio',
      'https://twitter.com/7zistudio',
      'https://linkedin.com/company/7zistudio',
    ],
  };
}

// Breadcrumb Schema 生成器
export function generateBreadcrumbSchema(
  items: Array<{ name: string; nameEn: string; path: string }>,
  locale?: string | null
) {
  const normalizedLocale: ValidLocale = normalizeLocale(locale);
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: normalizedLocale === 'zh' ? item.name : item.nameEn,
      item: `${baseUrl}/${normalizedLocale}${item.path}`,
    })),
  };
}

// FAQ Schema 生成器
export function generateFAQSchema(
  faqs: Array<{ question: string; questionEn?: string; answer: string; answerEn?: string }>,
  locale?: string | null
) {
  const normalizedLocale: ValidLocale = normalizeLocale(locale);
  
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: normalizedLocale === 'zh' ? faq.question : (faq.questionEn || faq.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: normalizedLocale === 'zh' ? faq.answer : (faq.answerEn || faq.answer),
      },
    })),
  };
}

// Service Schema 生成器
export function generateServiceSchema(
  service: {
    name: string;
    nameEn: string;
    description: string;
    descriptionEn: string;
    path: string;
  },
  locale?: string | null
) {
  const normalizedLocale: ValidLocale = normalizeLocale(locale);
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: normalizedLocale === 'zh' ? service.name : service.nameEn,
    description: normalizedLocale === 'zh' ? service.description : service.descriptionEn,
    url: `${baseUrl}/${normalizedLocale}${service.path}`,
    provider: {
      '@type': 'Organization',
      name: '7zi Studio',
      url: baseUrl,
    },
    areaServed: {
      '@type': 'Country',
      name: normalizedLocale === 'zh' ? 'China' : 'Worldwide',
    },
  };
}

// LocalBusiness Schema（如果有实体地址）
export function generateLocalBusinessSchema(locale?: string | null) {
  const normalizedLocale: ValidLocale = normalizeLocale(locale);
  
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: '7zi Studio',
    description: normalizedLocale === 'zh'
      ? 'AI 驱动的创新数字工作室'
      : 'AI-Powered Digital Innovation Studio',
    url: baseUrl,
    email: 'business@7zi.studio',
    priceRange: '1725557',
    openingHours: 'Mo-Su 00:00-24:00', // 24/7 服务
  };
}

// 组合 Schema 生成器（用于页面）
export function generatePageSchemas(
  schemas: Array<{ type: string; data: unknown }>,
  locale?: string | null
) {
  const normalizedLocale: ValidLocale = normalizeLocale(locale);
  
  return schemas.map(({ type, data }) => {
    switch (type) {
      case 'website':
        return generateWebSiteSchema(normalizedLocale);
      case 'organization':
        return generateOrganizationSchema(normalizedLocale);
      default:
        return data;
    }
  });
}

// 生成所有语言的 alternate links
export function getAllLanguageAlternates(path: string): Record<string, string> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return {
    'zh-CN': `${baseUrl}/zh${cleanPath}`,
    'en-US': `${baseUrl}/en${cleanPath}`,
    'x-default': `${baseUrl}/zh${cleanPath}`,
  };
}
