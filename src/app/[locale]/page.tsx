import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { ClientProviders } from '@/components/ClientProviders';
import { LazyAIChat, LazyGitHubActivity, LazyProjectDashboard } from '@/components/LazyComponents';
import { StructuredData } from '@/components/SEO';
import {
  Navigation,
  HeroSection,
  TeamPreview,
  ServicesSection,
  WhyUsSection,
  CTASection,
  FooterSection,
} from '@/components/home';
import type { Metadata } from 'next';

type Params = Promise<{ locale: string }>;

const baseUrl = 'https://7zi.studio';

// 动态 SEO 元数据
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  
  const titles = {
    zh: '首页 - AI 驱动的创新数字工作室',
    en: 'Home - AI-Powered Digital Innovation Studio',
  };
  
  const descriptions = {
    zh: '7zi Studio 由 11 位专业 AI 代理组成，提供网站开发、品牌设计、营销推广等全方位数字化服务。高效、专业、创新，助您打造卓越数字产品。',
    en: '7zi Studio consists of 11 professional AI agents, providing comprehensive digital services including web development, brand design, and marketing. Efficient, professional, innovative.',
  };
  
  const keywords = {
    zh: ['AI 数字工作室', '网站开发', '品牌设计', '数字化服务', 'AI 团队', '智能代理', '一站式解决方案'],
    en: ['AI Digital Studio', 'Web Development', 'Brand Design', 'Digital Services', 'AI Team', 'Intelligent Agents', 'One-stop Solution'],
  };

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    keywords: keywords[locale as 'zh' | 'en'] || keywords.zh,
    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      url: `${baseUrl}/${locale}`,
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: titles[locale as 'zh' | 'en'] || titles.zh,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      images: [`${baseUrl}/og-image.png`],
    },
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'zh-CN': `${baseUrl}/zh`,
        'en-US': `${baseUrl}/en`,
      },
    },
  };
}

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params;
  
  // 验证 locale
  if (!locales.includes(locale as Locale)) {
    // notFound() - 暂时跳过验证
  }
  
  setRequestLocale(locale);
  
  // 获取翻译
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tHero = await getTranslations({ locale, namespace: 'home.hero' });
  const tStats = await getTranslations({ locale, namespace: 'home.hero.stats' });
  const tTeamPreview = await getTranslations({ locale, namespace: 'home.teamPreview' });
  const tServices = await getTranslations({ locale, namespace: 'home.services' });
  const tWhyUs = await getTranslations({ locale, namespace: 'home.whyUs' });
  const tCta = await getTranslations({ locale, namespace: 'home.cta' });
  const tFooter = await getTranslations({ locale, namespace: 'footer' });

  return (
    <ClientProviders>
      <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">
        {/* SEO Structured Data for Homepage */}
        <StructuredData
          locale={locale as 'zh' | 'en'}
          schemas={['website', 'organization']}
          customSchemas={[
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: locale === 'zh' ? '7zi Studio 首页' : '7zi Studio Homepage',
              description: locale === 'zh'
                ? '7zi Studio 由 11 位专业 AI 代理组成，提供全方位数字化服务'
                : '7zi Studio consists of 11 professional AI agents, providing comprehensive digital services',
              url: `${baseUrl}/${locale}`,
              mainEntity: {
                '@type': 'Organization',
                name: '7zi Studio',
                url: baseUrl,
              },
            },
          ]}
        />

        {/* Navigation */}
        <Navigation tNav={tNav} />

        {/* Hero Section */}
        <HeroSection locale={locale} tHero={tHero} tStats={tStats} />

        {/* Team Preview */}
        <TeamPreview tTeamPreview={tTeamPreview} />

        {/* GitHub Activity - Lazy Loaded */}
        <LazyGitHubActivity />

        {/* Project Dashboard - Lazy Loaded */}
        <LazyProjectDashboard />

        {/* Services */}
        <ServicesSection tServices={tServices} />

        {/* Why Choose Us */}
        <WhyUsSection tWhyUs={tWhyUs} />

        {/* CTA Section */}
        <CTASection tCta={tCta} />

        {/* AI Chat Component - Lazy Loaded (SSR: false) */}
        <LazyAIChat />

        {/* Footer */}
        <FooterSection tNav={tNav} tFooter={tFooter} />
      </div>
    </ClientProviders>
  );
}