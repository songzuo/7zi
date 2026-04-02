import { setRequestLocale, getTranslations } from 'next-intl/server'

import { Locale, locales } from '@/i18n/config'

import { Link } from '@/i18n/routing'

import MobileMenu from '@/components/MobileMenu'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'

import { ThemeToggle } from '@/components/ThemeToggle'

import { StructuredData } from '@/components/SEO'

import PortfolioGrid from './components/PortfolioGrid'

import { CategoryFilterWrapper } from './components/CategoryFilterWrapper'

import { projects } from './data'

import type { Metadata } from 'next'

import { Suspense } from 'react'

type Params = Promise<{ locale: string }>

// ISR: Revalidate every 1 hour
export const revalidate = 3600 // 1小时

const baseUrl = 'https://7zi.studio'

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params

  const titles = {
    zh: '项目案例 - 作品展示',

    en: 'Portfolio - Our Work',
  }

  const keywords = {
    zh: ['7zi Studio', '作品集', '项目案例', 'Web 开发', '设计案例', '成功案例', 'AI 项目'],
    en: [
      '7zi Studio',
      'Portfolio',
      'Project Case',
      'Web Development',
      'Design Case',
      'Success Story',
      'AI Project',
    ],
  }

  const descriptions = {
    zh: '7zi Studio 项目案例展示，包括网站开发、移动应用、AI 解决方案和品牌设计作品',

    en: '7zi Studio portfolio showcasing our web development, mobile apps, AI solutions, and brand design work',
  }

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,

    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    keywords: keywords[locale as 'zh' | 'en'] || keywords.zh,

    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,

      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,

      url: `${baseUrl}/${locale}/portfolio`,

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
      canonical: `${baseUrl}/${locale}/portfolio`,

      languages: {
        'zh-CN': `${baseUrl}/zh/portfolio`,

        'en-US': `${baseUrl}/en/portfolio`,
      },
    },
  }
}

// Pre-generated particles

const HERO_PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 8.33) % 100}%`,

  top: `${(i * 7 + 15) % 70}%`,

  animationDelay: `${(i * 0.2) % 2}s`,

  animationDuration: `${2 + (i % 3) * 0.5}s`,
}))

export default async function PortfolioPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Promise<{ category?: string }>
}) {
  const { locale } = await params

  const { category } = await searchParams

  if (!locales.includes(locale as Locale)) {
    // Handle invalid locale
  }

  setRequestLocale(locale)

  const tNav = await getTranslations({ locale, namespace: 'nav' })

  // Filter projects by category

  const activeCategory = category || 'all'

  const filteredProjects =
    activeCategory === 'all' ? projects : projects.filter(p => p.category === activeCategory)

  return (
    <div className="min-h-screen bg-zinc-50 transition-colors duration-300 dark:bg-black">
      {/* SEO Structured Data */}

      <StructuredData
        locale={locale as 'zh' | 'en'}
        schemas={['website', 'organization']}
        customSchemas={[
          {
            '@context': 'https://schema.org',

            '@type': 'CollectionPage',

            name: locale === 'zh' ? '7zi Studio 项目案例' : '7zi Studio Portfolio',

            description:
              locale === 'zh' ? '7zi Studio 项目案例展示' : '7zi Studio portfolio showcase',

            url: `${baseUrl}/${locale}/portfolio`,
          },
        ]}
      />

      {/* Navigation */}

      <nav
        className="fixed top-0 right-0 left-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/80"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="touch-feedback text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white"
            aria-label="7zi Studio Home"
          >
            7zi<span className="text-cyan-500">Studio</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop Navigation */}

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

              <Link href="/portfolio" className="font-medium text-cyan-500">
                {locale === 'zh' ? '作品' : 'Portfolio'}
              </Link>

              <a
                href="https://visa.7zi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 transition-colors hover:text-cyan-500 dark:text-zinc-400"
              >
                {tNav('global')}
              </a>

              <ThemeToggle />

              <LanguageSwitcher />

              <Link
                href="/contact"
                className="touch-feedback rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-5 py-2 font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25"
              >
                {tNav('contact')}
              </Link>
            </div>

            {/* Mobile Navigation */}

            <div className="flex items-center gap-2 lg:hidden">
              <LanguageSwitcher />

              <ThemeToggle />

              <MobileMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}

      <section className="relative overflow-hidden px-6 pt-32 pb-16 sm:pt-40 sm:pb-20">
        {/* Background Effects */}

        <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />

        <div
          className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
          aria-hidden="true"
        />

        {/* Animated Particles */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {HERO_PARTICLES.map((particle, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 animate-pulse rounded-full bg-cyan-500/30"
              style={particle}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Badge */}

          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-4 py-2 text-sm font-medium text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" aria-hidden="true" />

            {locale === 'zh' ? '精选案例' : 'Featured Work'}
          </div>

          {/* Heading */}

          <h1 className="mb-6 text-4xl font-bold text-zinc-900 sm:text-5xl md:text-6xl dark:text-white">
            {locale === 'zh' ? (
              <>
                我们的作品
                <span className="bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent">
                  展示
                </span>
              </>
            ) : (
              <>
                Our{' '}
                <span className="bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent">
                  Portfolio
                </span>
              </>
            )}
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-zinc-600 sm:text-xl dark:text-zinc-400">
            {locale === 'zh'
              ? '从网站开发到 AI 解决方案，每一个项目都是我们对品质的追求'
              : 'From web development to AI solutions, every project reflects our commitment to quality'}
          </p>

          {/* Stats */}

          <div className="mt-10 flex justify-center gap-8 sm:gap-12">
            <div className="text-center">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                {projects.length}+
              </div>

              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {locale === 'zh' ? '完成项目' : 'Projects'}
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                100%
              </div>

              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {locale === 'zh' ? '客户满意' : 'Satisfaction'}
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                24/7
              </div>

              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {locale === 'zh' ? '在线支持' : 'Support'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}

      <section className="px-6 pb-8">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={<div className="h-12" />}>
            <CategoryFilterWrapper locale={locale} activeCategory={activeCategory} />
          </Suspense>
        </div>
      </section>

      {/* Portfolio Grid */}

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <PortfolioGrid projects={filteredProjects} locale={locale} />
        </div>
      </section>

      {/* CTA Section */}

      <section className="animate-gradient relative overflow-hidden bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-[length:200%_200%] px-6 py-16 sm:py-20">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            {locale === 'zh' ? '准备好开始您的项目了吗？' : 'Ready to Start Your Project?'}
          </h2>

          <p className="mb-8 text-lg text-white/80 sm:text-xl">
            {locale === 'zh'
              ? '让我们一起将您的想法变为现实'
              : "Let's bring your ideas to life together"}
          </p>

          <Link
            href="/contact"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-lg font-semibold text-cyan-600 transition-all hover:-translate-y-1 hover:bg-cyan-50 hover:shadow-xl sm:px-8"
          >
            {locale === 'zh' ? '立即咨询' : 'Contact Us Now'}

            <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>
    </div>
  )
}
