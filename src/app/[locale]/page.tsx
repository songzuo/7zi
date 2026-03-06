import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { ClientProviders, ThemeToggle, AIChat } from '@/components/ClientProviders';
import { GitHubActivity } from '@/components/GitHubActivity';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StructuredData, Breadcrumbs } from '@/components/SEO';
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

// Pre-generated particle positions (avoid Math.random() in render)
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 5 + (i % 3) * 15) % 100}%`,
  top: `${(i * 7 + (i % 5) * 8) % 100}%`,
  animationDelay: `${(i * 0.15) % 3}s`,
  animationDuration: `${2 + (i % 4) * 0.5}s`,
}));

// Pre-generated CTA background particles
const CTA_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  left: `${(i * 6.67) % 100}%`,
  top: `${(i * 7.5 + (i % 3) * 10) % 100}%`,
  animationDelay: `${(i * 0.13) % 2}s`,
  animationDuration: `${1 + (i % 3) * 0.5}s`,
}));

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params;
  
  // 验证 locale
  if (!locales.includes(locale as Locale)) {
    // notFound() - 暂时跳过验证
  }
  
  setRequestLocale(locale);
  
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
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white touch-feedback" aria-label="7zi Studio Home">
              7zi<span className="text-cyan-500">Studio</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-6">
                <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  {tNav('about')}
                </Link>
                <Link href="/team" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  {tNav('team')}
                </Link>
                <Link href="/blog" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  {tNav('blog')}
                </Link>
                <a
                  href="https://visa.7zi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors"
                >
                  {tNav('global')}
                </a>
                <Link href="/dashboard" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  {tNav('dashboard')}
                </Link>
                <ThemeToggle />
                <LanguageSwitcher />
                <Link
                  href="/contact"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all touch-feedback"
                >
                  {tNav('contact')}
                </Link>
              </div>
              
              {/* Mobile Navigation */}
              <div className="flex lg:hidden items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
                <MobileMenu />
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 pt-20" aria-labelledby="hero-title">
          {/* Animated Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" aria-hidden="true" />
          
          {/* Floating Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" aria-hidden="true" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" aria-hidden="true" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-500" aria-hidden="true" />
          
          {/* Animated Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {PARTICLES.map((particle, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-500/30 rounded-full animate-pulse"
                style={particle}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" aria-hidden="true" />
              <span className="hidden sm:inline">{tHero('badge')}</span>
              <span className="sm:hidden">{tHero('badgeShort')}</span>
            </div>
            
            {/* Heading */}
            <h1 id="hero-title" className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight">
              {locale === 'zh' ? (
                <>
                  用 AI 重新定义
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%] inline-block hover:scale-105 transition-transform duration-300">
                    团队协作
                  </span>
                </>
              ) : (
                <>
                  {tHero('title1Prefix')}
                </>
              )}
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-8 md:mb-12">
              {tHero('description')}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/about"
                className="group relative inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg overflow-hidden hover:shadow-xl hover:shadow-cyan-500/25 hover:-translate-y-1 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {tHero('cta1')}
                  <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
              </Link>
              <Link
                href="/team"
                className="group inline-flex items-center justify-center gap-2 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg hover:border-cyan-500 hover:text-cyan-500 dark:hover:border-cyan-400 dark:hover:text-cyan-400 transition-all hover:-translate-y-1"
              >
                {tHero('cta2')}
                <span className="group-hover:rotate-45 transition-transform" aria-hidden="true">↗</span>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-16 sm:mt-20 max-w-2xl mx-auto" role="region" aria-label="Statistics">
              <div className="text-center p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">
                  {tStats('experts.value')}
                </div>
                <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {tStats('experts.label')}
                </div>
              </div>
              <div className="text-center p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                  {tStats('service.value')}
                </div>
                <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {tStats('service.label')}
                </div>
              </div>
              <div className="text-center p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  {tStats('delivery.value')}
                </div>
                <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {tStats('delivery.label')}
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
            <div className="w-6 h-10 border-2 border-zinc-400 dark:border-zinc-600 rounded-full flex items-start justify-center p-2 hover:border-cyan-500 transition-colors">
              <div className="w-1.5 h-3 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* Team Preview */}
        <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900 overflow-hidden" aria-labelledby="team-preview-title">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 id="team-preview-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                {tTeamPreview('title')}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                {tTeamPreview('description')}
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4" role="list">
              {[
                { emoji: '🌟', name: 'AI Expert', color: 'from-yellow-400 to-orange-500' },
                { emoji: '📚', name: 'Consultant', color: 'from-blue-400 to-cyan-500' },
                { emoji: '🏗️', name: 'Architect', color: 'from-purple-400 to-pink-500' },
                { emoji: '⚡', name: 'Executor', color: 'from-green-400 to-emerald-500' },
                { emoji: '🛡️', name: 'Admin', color: 'from-red-400 to-rose-500' },
                { emoji: '🧪', name: 'Tester', color: 'from-indigo-400 to-violet-500' },
                { emoji: '🎨', name: 'Designer', color: 'from-pink-400 to-rose-500' },
                { emoji: '📣', name: 'Marketing', color: 'from-orange-400 to-amber-500' },
                { emoji: '💼', name: 'Sales', color: 'from-teal-400 to-cyan-500' },
                { emoji: '💰', name: 'Finance', color: 'from-emerald-400 to-green-500' },
                { emoji: '📺', name: 'Media', color: 'from-blue-400 to-indigo-500' },
              ].map((member, index) => (
                <div
                  key={member.name}
                  className="group flex flex-col items-center gap-3 p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                  role="listitem"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`} aria-hidden="true">
                    <span className="group-hover:animate-bounce block">{member.emoji}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 text-center">{member.name}</span>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Link
                href="/team"
                className="inline-flex items-center gap-2 text-cyan-500 font-medium hover:gap-3 transition-all group"
              >
                {tTeamPreview('viewTeam')}
                <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* GitHub Activity */}
        <GitHubActivity />

        {/* Project Dashboard */}
        <ProjectDashboard />

        {/* Services */}
        <section className="py-16 sm:py-20 px-6 bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent dark:via-zinc-900/50" aria-labelledby="services-title">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 id="services-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                {tServices('title')}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                {tServices('description')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8" role="list">
              {[
                {
                  emoji: '💻',
                  title: tServices('web.title'),
                  desc: tServices('web.description'),
                  color: 'from-blue-400 to-cyan-500',
                  features: tServices.raw('web.features') as string[],
                },
                {
                  emoji: '🎨',
                  title: tServices('design.title'),
                  desc: tServices('design.description'),
                  color: 'from-pink-400 to-rose-500',
                  features: tServices.raw('design.features') as string[],
                },
                {
                  emoji: '📈',
                  title: tServices('marketing.title'),
                  desc: tServices('marketing.description'),
                  color: 'from-purple-400 to-violet-500',
                  features: tServices.raw('marketing.features') as string[],
                },
              ].map((service, index) => (
                <article
                  key={service.title}
                  className="group relative bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                  role="listitem"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl`} aria-hidden="true" />
                  
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl sm:text-3xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`} aria-hidden="true">
                    {service.emoji}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                    {service.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                    {service.desc}
                  </p>
                  <ul className="space-y-2" aria-label="Service features">
                    {service.features.map((feature: string) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900" aria-labelledby="why-us-title">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 id="why-us-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                {tWhyUs('title')}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6" role="list">
              {[
                {
                  icon: '⚡',
                  title: tWhyUs('efficient.title'),
                  desc: tWhyUs('efficient.description'),
                  gradient: 'from-yellow-400 to-orange-500',
                },
                {
                  icon: '🎯',
                  title: tWhyUs('professional.title'),
                  desc: tWhyUs('professional.description'),
                  gradient: 'from-blue-400 to-cyan-500',
                },
                {
                  icon: '💰',
                  title: tWhyUs('cost.title'),
                  desc: tWhyUs('cost.description'),
                  gradient: 'from-green-400 to-emerald-500',
                },
                {
                  icon: '🔄',
                  title: tWhyUs('iteration.title'),
                  desc: tWhyUs('iteration.description'),
                  gradient: 'from-purple-400 to-pink-500',
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="group flex items-start gap-4 p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  role="listitem"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-md`} aria-hidden="true">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-20 px-6 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%] relative overflow-hidden" aria-labelledby="cta-title">
          <div className="absolute inset-0" aria-hidden="true">
            {CTA_PARTICLES.map((particle, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
                style={particle}
              />
            ))}
          </div>
          
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 id="cta-title" className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
              {tCta('title')}
            </h2>
            <p className="text-lg sm:text-xl text-white/80 mb-8">
              {tCta('description')}
            </p>
            <Link
              href="/contact"
              className="group inline-flex items-center justify-center gap-2 bg-white text-cyan-600 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-all hover:shadow-xl hover:-translate-y-1"
            >
              {tCta('button')}
              <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* AI Chat Component */}
        <AIChat />

        {/* Footer */}
        <footer className="py-12 px-6 bg-zinc-900 text-zinc-400" role="contentinfo">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-2xl font-bold text-white">
                7zi<span className="text-cyan-500">Studio</span>
              </div>
              <nav aria-label="Footer navigation">
                <ul className="flex gap-8">
                  <li><Link href="/" className="hover:text-white transition-colors">{tNav('home')}</Link></li>
                  <li><Link href="/about" className="hover:text-white transition-colors">{tNav('about')}</Link></li>
                  <li><Link href="/team" className="hover:text-white transition-colors">{tNav('team')}</Link></li>
                  <li><Link href="/blog" className="hover:text-white transition-colors">{tNav('blog')}</Link></li>
                </ul>
              </nav>
              <div className="text-sm">
                {tFooter('copyright')}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ClientProviders>
  );
}