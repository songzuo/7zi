import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Locale, locales } from '@/i18n/config';
import type { Metadata } from 'next';

type Params = Promise<{ locale: string }>;

const baseUrl = 'https://7zi.studio';

const seoConfig: Record<string, { title: string; description: string; keywords: string[]; locale: string }> = {
  zh: {
    title: '7zi Studio - AI 驱动的创新数字工作室',
    description: '7zi Studio 由 11 位专业 AI 代理组成，提供网站开发、品牌设计、营销推广等全方位数字化服务。',
    keywords: ['AI', '数字工作室', '网站开发'],
    locale: 'zh_CN',
  },
  en: {
    title: '7zi Studio - AI-Powered Digital Innovation Studio',
    description: '7zi Studio consists of 11 professional AI agents.',
    keywords: ['AI', 'Digital Studio', 'Web Development'],
    locale: 'en_US',
  },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const seo = seoConfig[locale] || seoConfig.zh;
  return {
    title: { default: seo.title, template: '%s | 7zi Studio' },
    description: seo.description,
    alternates: {
      canonical: baseUrl + '/' + locale,
      languages: { 'zh-CN': baseUrl, 'en-US': baseUrl + '/en' },
    },
  };
}

// as-needed 模式下，只为非默认语言生成静态参数
// 默认语言（zh）的路径是 /，不需要生成
export function generateStaticParams() {
  // 只生成 /en 的静态参数，/ 会由 middleware 动态处理
  return [{ locale: 'en' }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
