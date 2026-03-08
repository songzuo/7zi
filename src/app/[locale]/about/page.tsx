import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { ClientProviders, ThemeToggle } from '@/components/ClientProviders';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StructuredData } from '@/components/SEO';
import { 
  CompanyIntro, 
  TeamMembers, 
  Timeline, 
  Values, 
  CTASection,
  HeroSection,
  Footer 
} from '@/components/about';
import type { Metadata } from 'next';

type Params = Promise<{ locale: string }>;

const baseUrl = 'https://7zi.studio';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  
  const titles = {
    zh: '关于我们 - AI 驱动的创新数字工作室',
    en: 'About Us - AI-Powered Digital Innovation Studio',
  };
  
  const descriptions = {
    zh: '了解 7zi Studio 团队 - 由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务。',
    en: 'Learn about 7zi Studio - An innovative digital studio powered by 11 AI agents, providing comprehensive digital services.',
  };

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      url: `${baseUrl}/${locale}/about`,
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/about`,
      languages: {
        'zh-CN': `${baseUrl}/zh/about`,
        'en-US': `${baseUrl}/en/about`,
      },
    },
  };
}

export default async function AboutPage({ params }: { params: Params }) {
  const { locale } = await params;
  
  if (!locales.includes(locale as Locale)) {
    // notFound()
  }
  
  setRequestLocale(locale);
  
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  return (
    <ClientProviders>
      <div className="min-h-screen bg-zinc-50 dark:bg-black overflow-x-hidden">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
              7zi<span className="text-cyan-500">Studio</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden lg:flex items-center gap-6">
                <Link href="/about" className="text-cyan-500 font-medium">{tNav('about')}</Link>
                <Link href="/team" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('team')}</Link>
                <Link href="/blog" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('blog')}</Link>
                <Link href="/dashboard" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">{tNav('dashboard')}</Link>
                <ThemeToggle />
                <LanguageSwitcher />
                <Link href="/contact" className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                  {tNav('contact')}
                </Link>
              </div>
              <div className="flex lg:hidden items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
                <MobileMenu />
              </div>
            </div>
          </div>
        </nav>

        <StructuredData locale={locale as 'zh' | 'en'} schemas={['website', 'organization']} />

        <HeroSection />
        <CompanyIntro />
        <TeamMembers />
        <Timeline />
        <Values />
        <CTASection />
        <Footer />
      </div>
    </ClientProviders>
  );
}