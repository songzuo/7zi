import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import type { Metadata } from 'next';

type Params = Promise<{ locale: string }>;

const baseUrl = 'https://7zi.studio';

// 联系方式配置
export const contactInfo = [
  { emoji: '📧', key: 'business' },
  { emoji: '💻', key: 'support' },
  { emoji: '🤝', key: 'careers' },
];

// 生成页面元数据
export async function generateContactMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  
  const titles = {
    zh: '联系我们 - 获取专业数字化服务',
    en: 'Contact Us - Get Professional Digital Services',
  };
  
  const descriptions = {
    zh: '联系 7zi Studio - AI 驱动的创新数字工作室。商务合作、技术支持、项目咨询，我们 24 小时内回复。',
    en: 'Contact 7zi Studio - AI-powered digital innovation studio. Business cooperation, technical support, project consultation. We respond within 24 hours.',
  };

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      url: `${baseUrl}/${locale}/contact`,
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/contact`,
      languages: {
        'zh-CN': `${baseUrl}/zh/contact`,
        'en-US': `${baseUrl}/en/contact`,
      },
    },
  };
}

// 获取翻译的 hook
export async function getContactTranslations(locale: string) {
  if (!locales.includes(locale as Locale)) {
    // notFound() - 但在服务器组件中我们直接返回
  }
  
  setRequestLocale(locale);
  
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tContact = await getTranslations({ locale, namespace: 'contact' });
  const tFooter = await getTranslations({ locale, namespace: 'footer' });

  return {
    tNav,
    tContact,
    tFooter,
    locale: locale as 'zh' | 'en',
    baseUrl,
    contactInfo,
  };
}

// 获取 FAQ 项目
export function getFAQItems(t: (key: string) => string, locale: 'zh' | 'en'): Array<{ question: string; answer: string }> {
  // 使用 raw 获取数组数据
  const rawItems = t('faq.items');
  if (Array.isArray(rawItems)) {
    return rawItems as Array<{ question: string; answer: string }>;
  }
  return [];
}