/**
 * 首页优化示例 - 使用 React Suspense 实现流式渲染
 * 
 * 此文件展示如何优化首屏加载性能：
 * 1. 关键内容立即渲染
 * 2. 非关键内容使用 Suspense 流式渲染
 * 3. 客户端组件使用 Lazy Loading
 * 
 * 注意：这是一个示例文件，展示最佳实践
 */

import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { Link } from '@/i18n/routing';

// 骨架屏组件
import {
  TeamPreviewSkeleton,
  ServicesSkeleton,
  WhyUsSkeleton,
  CTASkeleton,
} from '@/components/skeletons';

// 懒加载组件（客户端渲染）
import { LazyAIChat, LazyGitHubActivity, LazyProjectDashboard } from '@/components/LazyComponents';

// 同步组件（立即渲染）
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { StructuredData } from '@/components/SEO';

// 类型
import type { Metadata } from 'next';

type Params = Promise<{ locale: string }>;

const baseUrl = 'https://7zi.studio';

// ============================================================================
// Hero 组件 - 关键内容，立即渲染
// ============================================================================

async function HeroSection({ locale }: { locale: string }) {
  const tHero = await getTranslations({ locale, namespace: 'home.hero' });
  const tStats = await getTranslations({ locale, namespace: 'home.hero.stats' });

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 pt-20">
      {/* 简化的背景 - 减少首屏渲染负担 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
          <span>{tHero('badge')}</span>
        </div>
        
        {/* 标题 - LCP 元素 */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight">
          {locale === 'zh' ? (
            <>
              {tHero('title1')}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500">
                {tHero('title2')}
              </span>
            </>
          ) : (
            tHero('title1Prefix')
          )}
        </h1>
        
        {/* 描述 */}
        <p className="text-lg sm:text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-8 md:mb-12">
          {tHero('description')}
        </p>
        
        {/* CTA 按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/about"
            className="group relative inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg overflow-hidden hover:shadow-xl hover:shadow-cyan-500/25 hover:-translate-y-1 transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-2">
              {tHero('cta1')}
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link
            href="/team"
            className="group inline-flex items-center justify-center gap-2 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg hover:border-cyan-500 hover:text-cyan-500 dark:hover:border-cyan-400 dark:hover:text-cyan-400 transition-all hover:-translate-y-1"
          >
            {tHero('cta2')}
            <span className="group-hover:rotate-45 transition-transform">↗</span>
          </Link>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-16 sm:mt-20 max-w-2xl mx-auto">
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
    </section>
  );
}

// ============================================================================
// Team Preview 组件 - 流式渲染
// ============================================================================

async function TeamPreview({ locale }: { locale: string }) {
  const tTeamPreview = await getTranslations({ locale, namespace: 'home.teamPreview' });

  const teamMembers = [
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
  ];

  return (
    <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tTeamPreview('title')}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {tTeamPreview('description')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {teamMembers.map((member, index) => (
            <div
              key={member.name}
              className="group flex flex-col items-center gap-3 p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
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
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Services 组件 - 流式渲染
// ============================================================================

async function Services({ locale }: { locale: string }) {
  const tServices = await getTranslations({ locale, namespace: 'home.services' });

  const services = [
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
  ];

  return (
    <section className="py-16 sm:py-20 px-6 bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent dark:via-zinc-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tServices('title')}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {tServices('description')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, index) => (
            <article
              key={service.title}
              className="group relative bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl`} />
              
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl sm:text-3xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                {service.emoji}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                {service.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {service.desc}
              </p>
              <ul className="space-y-2">
                {service.features.map((feature: string) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Why Us 组件 - 流式渲染
// ============================================================================

async function WhyUs({ locale }: { locale: string }) {
  const tWhyUs = await getTranslations({ locale, namespace: 'home.whyUs' });

  const items = [
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
  ];

  return (
    <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tWhyUs('title')}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {items.map((item, index) => (
            <div
              key={item.title}
              className="group flex items-start gap-4 p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-md`}>
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
  );
}

// ============================================================================
// CTA 组件 - 流式渲染
// ============================================================================

async function CTASection({ locale }: { locale: string }) {
  const tCta = await getTranslations({ locale, namespace: 'home.cta' });

  return (
    <section className="py-16 sm:py-20 px-6 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 relative overflow-hidden">
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
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
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>
    </section>
  );
}

// ============================================================================
// 主页面组件
// ============================================================================

export default async function OptimizedHomePage({ params }: { params: Params }) {
  const { locale } = await params;
  
  // 验证 locale
  if (!locales.includes(locale as Locale)) {
    // notFound() - 暂时跳过验证
  }
  
  setRequestLocale(locale);
  
  // 获取导航翻译（关键，立即需要）
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">
      {/* SEO 结构化数据 - 立即渲染 */}
      <StructuredData
        locale={locale as 'zh' | 'en'}
        schemas={['website', 'organization']}
      />

      {/* 导航栏 - 关键内容，立即渲染 */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            7zi<span className="text-cyan-500">Studio</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
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
              <Link href="/dashboard" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                {tNav('dashboard')}
              </Link>
              <ThemeToggle />
              <LanguageSwitcher />
              <Link href="/contact" className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                {tNav('contact')}
              </Link>
            </div>
            
            {/* 移动端导航 */}
            <div className="flex lg:hidden items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <MobileMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero 区域 - 关键内容，立即渲染 (LCP 元素) */}
      <HeroSection locale={locale} />

      {/* Team Preview - 使用 Suspense 流式渲染 */}
      <Suspense fallback={<TeamPreviewSkeleton />}>
        <TeamPreview locale={locale} />
      </Suspense>

      {/* GitHub Activity - 客户端懒加载 */}
      <LazyGitHubActivity />

      {/* Project Dashboard - 客户端懒加载 */}
      <LazyProjectDashboard />

      {/* Services - 使用 Suspense 流式渲染 */}
      <Suspense fallback={<ServicesSkeleton />}>
        <Services locale={locale} />
      </Suspense>

      {/* Why Us - 使用 Suspense 流式渲染 */}
      <Suspense fallback={<WhyUsSkeleton />}>
        <WhyUs locale={locale} />
      </Suspense>

      {/* CTA Section - 使用 Suspense 流式渲染 */}
      <Suspense fallback={<CTASkeleton />}>
        <CTASection locale={locale} />
      </Suspense>

      {/* AI Chat - 客户端懒加载 */}
      <LazyAIChat />
    </div>
  );
}

// ============================================================================
// 元数据导出
// ============================================================================

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  
  const titles = {
    zh: '首页 - AI 驱动的创新数字工作室',
    en: 'Home - AI-Powered Digital Innovation Studio',
  };
  
  const descriptions = {
    zh: '7zi Studio 由 11 位专业 AI 代理组成，提供网站开发、品牌设计、营销推广等全方位数字化服务。高效、专业、创新。',
    en: '7zi Studio consists of 11 professional AI agents, providing comprehensive digital services including web development, brand design, and marketing.',
  };

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      url: `${baseUrl}/${locale}`,
      type: 'website',
      images: [{ url: `${baseUrl}/og-image.svg`, width: 1200, height: 630 }],
    },
  };
}
