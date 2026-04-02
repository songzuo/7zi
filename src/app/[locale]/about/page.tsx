import { setRequestLocale, getTranslations } from 'next-intl/server'

import { Locale, locales } from '@/i18n/config'

import { Link } from '@/i18n/routing'

import MobileMenu from '@/components/MobileMenu'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'

import { ThemeToggle } from '@/components/ThemeToggle'

import { StructuredData } from '@/components/SEO'

import type { Metadata } from 'next'

type Params = Promise<{ locale: string }>

// ISR: Revalidate every 1 hour
export const revalidate = 3600 // 1小时

const baseUrl = 'https://7zi.studio'

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params

  const titles = {
    zh: '关于我们 - AI 驱动的创新数字工作室',

    en: 'About Us - AI-Powered Digital Innovation Studio',
  }

  const keywords = {
    zh: ['7zi Studio', '关于我们', 'AI 团队', '数字工作室', 'AI 代理', '网站开发', '品牌设计'],
    en: [
      '7zi Studio',
      'About Us',
      'AI Team',
      'Digital Studio',
      'AI Agents',
      'Web Development',
      'Brand Design',
    ],
  }

  const descriptions = {
    zh: '了解 7zi Studio 团队 - 由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务。',

    en: 'Learn about 7zi Studio - An innovative digital studio powered by 11 AI agents, providing comprehensive digital services.',
  }

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,

    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    keywords: keywords[locale as 'zh' | 'en'] || keywords.zh,

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
  }
}

// 团队成员数据

const teamMembers = [
  { id: 1, emoji: '🌟', color: 'from-yellow-400 to-orange-500', key: 'expert' },

  { id: 2, emoji: '📚', color: 'from-blue-400 to-indigo-600', key: 'consultant' },

  { id: 3, emoji: '🏗️', color: 'from-purple-400 to-pink-600', key: 'architect' },

  { id: 4, emoji: '⚡', color: 'from-green-400 to-emerald-600', key: 'executor' },

  { id: 5, emoji: '🛡️', color: 'from-red-400 to-rose-600', key: 'admin' },

  { id: 6, emoji: '🧪', color: 'from-cyan-400 to-teal-600', key: 'tester' },

  { id: 7, emoji: '🎨', color: 'from-pink-400 to-rose-500', key: 'designer' },

  { id: 8, emoji: '📣', color: 'from-amber-400 to-yellow-600', key: 'promoter' },

  { id: 9, emoji: '💼', color: 'from-violet-400 to-purple-600', key: 'sales' },

  { id: 10, emoji: '💰', color: 'from-emerald-400 to-green-600', key: 'finance' },

  { id: 11, emoji: '📺', color: 'from-sky-400 to-blue-600', key: 'media' },
]

// 发展历程数据

const timeline = [
  { year: '2024', emoji: '🚀', color: 'from-cyan-500 to-blue-600', key: '0' },

  { year: '2024', emoji: '👥', color: 'from-purple-500 to-pink-600', key: '1' },

  { year: '2025', emoji: '📈', color: 'from-green-500 to-emerald-600', key: '2' },

  { year: '2025', emoji: '⚡', color: 'from-amber-500 to-orange-600', key: '3' },
]

export default async function AboutPage({ params }: { params: Params }) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    // notFound()
  }

  setRequestLocale(locale)

  const tNav = await getTranslations({ locale, namespace: 'nav' })

  const tAbout = await getTranslations({ locale, namespace: 'about' })

  const tTeam = await getTranslations({ locale, namespace: 'team.members' })

  const tFooter = await getTranslations({ locale, namespace: 'footer' })

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-50 dark:bg-black">
      {/* Animated Background Elements */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/10 blur-3xl delay-1000" />
      </div>

      {/* Navigation */}

      <nav
        className="fixed top-0 right-0 left-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/80"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white">
            7zi<span className="text-cyan-500">Studio</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-6 lg:flex">
              <Link href="/about" className="font-medium text-cyan-500">
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

            <div className="flex items-center gap-2 lg:hidden">
              <LanguageSwitcher />

              <ThemeToggle />

              <MobileMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* SEO Structured Data */}

      <StructuredData locale={locale as 'zh' | 'en'} schemas={['website', 'organization']} />

      {/* Hero Section */}

      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-black px-6 py-32 pt-24 dark:from-black dark:via-zinc-900 dark:to-zinc-800">
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-cyan-400 backdrop-blur-sm">
            <span className="animate-pulse">✨</span>

            {tAbout('hero.badge')}
          </div>

          <h1 className="mb-8 text-5xl leading-tight font-bold text-white md:text-7xl">
            {tAbout('hero.title')}{' '}
            <span className="animate-gradient bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-[length:200%_200%] bg-clip-text text-transparent">
              7zi Studio
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-300 md:text-2xl">
            {tAbout('hero.description')}
          </p>
        </div>
      </section>

      {/* Studio Introduction */}

      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xl transition-colors duration-500 hover:border-cyan-500/50 md:p-12 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-8 flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 text-2xl"
                aria-hidden="true"
              >
                🚀
              </div>

              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                {tAbout('intro.title')}
              </h2>
            </div>

            <div className="space-y-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
              <p className="line-clamp-4 overflow-hidden break-words sm:line-clamp-none">
                <strong className="bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text font-bold text-transparent dark:from-cyan-400 dark:to-purple-400">
                  7zi Studio
                </strong>{' '}
                {tAbout('intro.p1')}
              </p>

              <p className="line-clamp-4 overflow-hidden break-words sm:line-clamp-none">
                {tAbout('intro.p2')}
              </p>

              <p>{tAbout('intro.p3')}</p>
            </div>

            {/* Stats Cards */}

            <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
              <div className="group rounded-2xl border border-cyan-200/50 bg-gradient-to-br from-cyan-50 to-blue-50 p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg dark:border-cyan-800/50 dark:from-cyan-900/20 dark:to-blue-900/20">
                <div className="mb-2 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
                  {tAbout('intro.stats.experts.value')}
                </div>

                <div className="font-medium text-zinc-600 dark:text-zinc-400">
                  {tAbout('intro.stats.experts.label')}
                </div>

                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                  {tAbout('intro.stats.experts.sub')}
                </div>
              </div>

              <div className="group rounded-2xl border border-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50 p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg dark:border-purple-800/50 dark:from-purple-900/20 dark:to-pink-900/20">
                <div className="mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-4xl font-bold text-transparent">
                  {tAbout('intro.stats.projects.value')}
                </div>

                <div className="font-medium text-zinc-600 dark:text-zinc-400">
                  {tAbout('intro.stats.projects.label')}
                </div>

                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                  {tAbout('intro.stats.projects.sub')}
                </div>
              </div>

              <div className="group rounded-2xl border border-green-200/50 bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg dark:border-green-800/50 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-4xl font-bold text-transparent">
                  {tAbout('intro.stats.delivery.value')}
                </div>

                <div className="font-medium text-zinc-600 dark:text-zinc-400">
                  {tAbout('intro.stats.delivery.label')}
                </div>

                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                  {tAbout('intro.stats.delivery.sub')}
                </div>
              </div>

              <div className="group rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg dark:border-amber-800/50 dark:from-amber-900/20 dark:to-orange-900/20">
                <div className="mb-2 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-4xl font-bold text-transparent">
                  {tAbout('intro.stats.support.value')}
                </div>

                <div className="font-medium text-zinc-600 dark:text-zinc-400">
                  {tAbout('intro.stats.support.label')}
                </div>

                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                  {tAbout('intro.stats.support.sub')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Members */}

      <section className="bg-white px-6 py-24 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400">
              <span>👥</span>

              {tAbout('team.badge')}
            </div>

            <h2 className="mb-4 text-4xl font-bold text-zinc-900 md:text-5xl dark:text-white">
              {tAbout('team.title')}
            </h2>

            <p className="mx-auto max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
              {tAbout('team.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-8 transition-all duration-500 hover:-translate-y-3 hover:border-transparent hover:shadow-2xl dark:border-zinc-800 dark:bg-black"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${member.color} opacity-0 transition-opacity duration-500 group-hover:opacity-10`}
                  aria-hidden="true"
                />

                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${member.color} -z-10 opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-100`}
                  aria-hidden="true"
                />

                <div
                  className="absolute inset-[2px] -z-10 rounded-2xl bg-zinc-50 transition-colors duration-500 group-hover:bg-white dark:bg-black dark:group-hover:bg-zinc-900"
                  aria-hidden="true"
                />

                <div className="relative z-10">
                  <div
                    className="mb-4 text-5xl transition-transform duration-300 group-hover:scale-110"
                    aria-hidden="true"
                  >
                    {member.emoji}
                  </div>

                  <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-white">
                    {tTeam(`${member.key}.name`)}
                  </h3>

                  <p
                    className={`bg-gradient-to-r text-sm font-medium ${member.color} mb-4 bg-clip-text text-transparent`}
                  >
                    {tTeam(`${member.key}.role`)}
                  </p>

                  <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {tTeam(`${member.key}.description`)}
                  </p>

                  <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 animate-pulse rounded-full bg-green-500"
                        aria-hidden="true"
                      />

                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        24/7 {locale === 'zh' ? '在线' : 'Online'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}

      <section className="bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-100 px-6 py-24 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400">
              <span>📅</span>

              {tAbout('timeline.badge')}
            </div>

            <h2 className="mb-4 text-4xl font-bold text-zinc-900 md:text-5xl dark:text-white">
              {tAbout('timeline.title')}
            </h2>

            <p className="mx-auto max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
              {tAbout('timeline.description')}
            </p>
          </div>

          <div className="relative">
            <div
              className="absolute top-0 bottom-0 left-8 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500 md:left-1/2"
              aria-hidden="true"
            />

            <div className="space-y-12">
              {timeline.map((item, index) => {
                const timelineItem = tAbout.raw('timeline.items') as Array<{
                  year: string
                  title: string
                  description: string
                }>

                return (
                  <div
                    key={item.key}
                    className={`relative flex items-center gap-8 md:gap-0 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                  >
                    <div
                      className={`flex-1 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'} text-center`}
                    >
                      <div className="group inline-block rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg transition-all duration-300 hover:border-cyan-500/50 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="mb-2 flex items-center justify-start gap-2">
                          <span className="text-2xl" aria-hidden="true">
                            {item.emoji}
                          </span>

                          <span
                            className={`bg-gradient-to-r text-lg font-bold ${item.color} bg-clip-text text-transparent`}
                          >
                            {timelineItem?.[index]?.year || item.year}
                          </span>
                        </div>

                        <h3 className="mb-2 text-lg font-bold text-zinc-900 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
                          {timelineItem?.[index]?.title}
                        </h3>

                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {timelineItem?.[index]?.description}
                        </p>
                      </div>
                    </div>

                    <div
                      className="absolute left-8 z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-cyan-500 to-purple-600 text-lg font-bold text-white shadow-lg md:left-1/2 md:-translate-x-1/2 dark:border-zinc-900"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </div>

                    <div className="hidden flex-1 md:block" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}

      <section className="bg-white px-6 py-24 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400">
              <span>💎</span>

              {tAbout('values.badge')}
            </div>

            <h2 className="mb-4 text-4xl font-bold text-zinc-900 dark:text-white">
              {tAbout('values.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {['collaboration', 'innovation', 'quality', 'customer'].map((key, index) => {
              const colors = [
                'from-cyan-500 to-blue-600',

                'from-purple-500 to-pink-600',

                'from-amber-500 to-orange-600',

                'from-green-500 to-emerald-600',
              ]

              const emojis = ['🚀', '💡', '🎯', '🤝']

              return (
                <div
                  key={key}
                  className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-black"
                >
                  <div
                    className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${colors[index]} scale-x-0 transform transition-transform duration-500 group-hover:scale-x-100`}
                    aria-hidden="true"
                  />

                  <div
                    className="mb-4 text-4xl transition-transform duration-300 group-hover:scale-110"
                    aria-hidden="true"
                  >
                    {emojis[index]}
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-zinc-900 dark:text-white">
                    {tAbout(`values.items.${key}.title`)}
                  </h3>

                  <p className="text-zinc-600 dark:text-zinc-400">
                    {tAbout(`values.items.${key}.description`)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}

      <section className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 px-6 py-24">
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:32px_32px]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-5xl">{tAbout('cta.title')}</h2>

          <p className="mb-10 text-xl text-white/80">{tAbout('cta.description')}</p>

          <Link
            href="/contact"
            className="group inline-flex items-center gap-3 rounded-full bg-white px-10 py-5 text-lg font-semibold text-cyan-600 transition-all duration-300 hover:scale-105 hover:bg-cyan-50 hover:shadow-2xl"
          >
            {tAbout('cta.button')}

            <span
              className="transition-transform duration-300 group-hover:translate-x-2"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </section>

      {/* Footer */}

      <footer className="bg-zinc-900 px-6 py-12 text-zinc-400" role="contentinfo">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-2xl font-bold text-white">
              7zi<span className="text-cyan-500">Studio</span>
            </div>

            <nav aria-label="Footer navigation">
              <ul className="flex gap-8">
                <li>
                  <Link href="/" className="transition-colors hover:text-white">
                    {tNav('home')}
                  </Link>
                </li>

                <li>
                  <Link href="/about" className="transition-colors hover:text-white">
                    {tNav('about')}
                  </Link>
                </li>

                <li>
                  <Link href="/team" className="transition-colors hover:text-white">
                    {tNav('team')}
                  </Link>
                </li>

                <li>
                  <Link href="/blog" className="transition-colors hover:text-white">
                    {tNav('blog')}
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="text-sm">{tFooter('copyright')}</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
