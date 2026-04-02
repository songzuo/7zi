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

import { Suspense } from 'react'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { Locale, locales } from '@/i18n/config'
import { Link } from '@/i18n/routing'

// 骨架屏组件
import {
  TeamPreviewSkeleton,
  ServicesSkeleton,
  WhyUsSkeleton,
  CTASkeleton,
} from '@/components/skeletons'

// 懒加载组件（客户端渲染）
import { LazyAIChat, LazyGitHubActivity, LazyProjectDashboard } from '@/components/LazyComponents'

// 同步组件（立即渲染）
import MobileMenu from '@/components/MobileMenu'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { StructuredData } from '@/components/SEO'

// 类型
import type { Metadata } from 'next'

type Params = Promise<{ locale: string }>

const baseUrl = 'https://7zi.studio'

// ============================================================================
// Hero 组件 - 关键内容，立即渲染
// ============================================================================

async function HeroSection({ locale }: { locale: string }) {
  const tHero = await getTranslations({ locale, namespace: 'home.hero' })
  const tStats = await getTranslations({ locale, namespace: 'home.hero.stats' })

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 pt-20 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* 简化的背景 - 减少首屏渲染负担 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-4 py-2 text-sm font-medium text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
          <span>{tHero('badge')}</span>
        </div>

        {/* 标题 - LCP 元素 */}
        <h1 className="mb-6 text-4xl leading-tight font-bold text-zinc-900 sm:text-5xl md:text-7xl lg:text-8xl dark:text-white">
          {locale === 'zh' ? (
            <>
              {tHero('title1')}
              <br />
              <span className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {tHero('title2')}
              </span>
            </>
          ) : (
            tHero('title1Prefix')
          )}
        </h1>

        {/* 描述 */}
        <p className="mx-auto mb-8 max-w-3xl text-lg text-zinc-600 sm:text-xl md:mb-12 md:text-2xl dark:text-zinc-400">
          {tHero('description')}
        </p>

        {/* CTA 按钮 */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/about"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-zinc-900 px-6 py-4 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/25 sm:px-8 dark:bg-white dark:text-zinc-900"
          >
            <span className="relative z-10 flex items-center gap-2">
              {tHero('cta1')}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>
          <Link
            href="/team"
            className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-zinc-300 px-6 py-4 text-lg font-semibold text-zinc-700 transition-all hover:-translate-y-1 hover:border-cyan-500 hover:text-cyan-500 sm:px-8 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-cyan-400 dark:hover:text-cyan-400"
          >
            {tHero('cta2')}
            <span className="transition-transform group-hover:rotate-45">↗</span>
          </Link>
        </div>

        {/* 统计数据 */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4 sm:mt-20 sm:gap-8">
          <div className="rounded-2xl p-4 text-center transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
              {tStats('experts.value')}
            </div>
            <div className="mt-1 text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
              {tStats('experts.label')}
            </div>
          </div>
          <div className="rounded-2xl p-4 text-center transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
              {tStats('service.value')}
            </div>
            <div className="mt-1 text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
              {tStats('service.label')}
            </div>
          </div>
          <div className="rounded-2xl p-4 text-center transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
              {tStats('delivery.value')}
            </div>
            <div className="mt-1 text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
              {tStats('delivery.label')}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// Team Preview 组件 - 流式渲染
// ============================================================================

async function TeamPreview({ locale }: { locale: string }) {
  const tTeamPreview = await getTranslations({ locale, namespace: 'home.teamPreview' })

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
  ]

  return (
    <section className="overflow-hidden bg-white px-6 py-16 sm:py-20 dark:bg-zinc-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900 sm:text-3xl md:text-4xl dark:text-white">
            {tTeamPreview('title')}
          </h2>
          <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">
            {tTeamPreview('description')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {teamMembers.map((member, index) => (
            <div
              key={member.name}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-zinc-50 p-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl sm:p-6 dark:bg-zinc-800"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-3xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6`}
              >
                <span className="block group-hover:animate-bounce">{member.emoji}</span>
              </div>
              <span className="text-center text-xs font-medium text-zinc-700 sm:text-sm dark:text-zinc-300">
                {member.name}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/team"
            className="group inline-flex items-center gap-2 font-medium text-cyan-500 transition-all hover:gap-3"
          >
            {tTeamPreview('viewTeam')}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// Services 组件 - 流式渲染
// ============================================================================

async function Services({ locale }: { locale: string }) {
  const tServices = await getTranslations({ locale, namespace: 'home.services' })

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
  ]

  return (
    <section className="bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent px-6 py-16 sm:py-20 dark:via-zinc-900/50">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900 sm:text-3xl md:text-4xl dark:text-white">
            {tServices('title')}
          </h2>
          <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">
            {tServices('description')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
          {services.map((service, index) => (
            <article
              key={service.title}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl sm:p-8 dark:bg-zinc-900"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${service.color} -z-10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100`}
              />

              <div
                className={`h-14 w-14 rounded-2xl bg-gradient-to-br sm:h-16 sm:w-16 ${service.color} mb-6 flex items-center justify-center text-2xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 sm:text-3xl`}
              >
                {service.emoji}
              </div>
              <h3 className="mb-3 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white">
                {service.title}
              </h3>
              <p className="mb-4 text-zinc-600 dark:text-zinc-400">{service.desc}</p>
              <ul className="space-y-2">
                {service.features.map((feature: string) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// Why Us 组件 - 流式渲染
// ============================================================================

async function WhyUs({ locale }: { locale: string }) {
  const tWhyUs = await getTranslations({ locale, namespace: 'home.whyUs' })

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
  ]

  return (
    <section className="bg-white px-6 py-16 sm:py-20 dark:bg-zinc-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900 sm:text-3xl md:text-4xl dark:text-white">
            {tWhyUs('title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {items.map((item, index) => (
            <div
              key={item.title}
              className="group flex items-start gap-4 rounded-2xl bg-zinc-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-zinc-800"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`h-12 w-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}
              >
                {item.icon}
              </div>
              <div>
                <h3 className="mb-1 font-bold text-zinc-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// CTA 组件 - 流式渲染
// ============================================================================

async function CTASection({ locale }: { locale: string }) {
  const tCta = await getTranslations({ locale, namespace: 'home.cta' })

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 px-6 py-16 sm:py-20">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="mb-6 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
          {tCta('title')}
        </h2>
        <p className="mb-8 text-lg text-white/80 sm:text-xl">{tCta('description')}</p>
        <Link
          href="/contact"
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-lg font-semibold text-cyan-600 transition-all hover:-translate-y-1 hover:bg-cyan-50 hover:shadow-xl sm:px-8"
        >
          {tCta('button')}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  )
}

// ============================================================================
// 主页面组件
// ============================================================================

export default async function OptimizedHomePage({ params }: { params: Params }) {
  const { locale } = await params

  // 验证 locale
  if (!locales.includes(locale as Locale)) {
    // notFound() - 暂时跳过验证
  }

  setRequestLocale(locale)

  // 获取导航翻译（关键，立即需要）
  const tNav = await getTranslations({ locale, namespace: 'nav' })

  return (
    <div className="min-h-screen bg-zinc-50 transition-colors duration-300 dark:bg-black">
      {/* SEO 结构化数据 - 立即渲染 */}
      <StructuredData locale={locale as 'zh' | 'en'} schemas={['website', 'organization']} />

      {/* 导航栏 - 关键内容，立即渲染 */}
      <nav className="fixed top-0 right-0 left-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white">
            7zi<span className="text-cyan-500">Studio</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-6 lg:flex">
              <Link
                href="/about"
                className="text-zinc-600 transition-colors hover:text-cyan-500 dark:text-zinc-400"
              >
                {tNav('about')}
              </Link>
              <Link
                href="/team"
                className="text-zinc-600 transition-colors hover:text-cyan-500 dark:text-zinc-400"
              >
                {tNav('team')}
              </Link>
              <Link
                href="/blog"
                className="text-zinc-600 transition-colors hover:text-cyan-500 dark:text-zinc-400"
              >
                {tNav('blog')}
              </Link>
              <Link
                href="/dashboard"
                className="text-zinc-600 transition-colors hover:text-cyan-500 dark:text-zinc-400"
              >
                {tNav('dashboard')}
              </Link>
              <ThemeToggle />
              <LanguageSwitcher />
              <Link
                href="/contact"
                className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-5 py-2 font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25"
              >
                {tNav('contact')}
              </Link>
            </div>

            {/* 移动端导航 */}
            <div className="flex items-center gap-2 lg:hidden">
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
  )
}

// ============================================================================
// 元数据导出
// ============================================================================

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params

  const titles = {
    zh: '首页 - AI 驱动的创新数字工作室',
    en: 'Home - AI-Powered Digital Innovation Studio',
  }

  const descriptions = {
    zh: '7zi Studio 由 11 位专业 AI 代理组成，提供网站开发、品牌设计、营销推广等全方位数字化服务。高效、专业、创新。',
    en: '7zi Studio consists of 11 professional AI agents, providing comprehensive digital services including web development, brand design, and marketing.',
  }

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
  }
}
