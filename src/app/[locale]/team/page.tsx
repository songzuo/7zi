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
    zh: '团队成员 - 11 位 AI 专家团队',

    en: 'Our Team - 11 AI Experts',
  }

  const keywords = {
    zh: ['7zi Studio', '团队成员', 'AI 专家', '架构师', '设计师', '开发团队', 'AI 团队'],
    en: [
      '7zi Studio',
      'Team Members',
      'AI Experts',
      'Architect',
      'Designer',
      'Development Team',
      'AI Team',
    ],
  }

  const descriptions = {
    zh: '7zi Studio 团队成员介绍 - 11 位专业的 AI 代理，从战略规划到执行落地，为您提供全方位的数字化服务。',

    en: '7zi Studio team members - 11 professional AI agents providing comprehensive digital services.',
  }

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,

    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    keywords: keywords[locale as 'zh' | 'en'] || keywords.zh,

    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,

      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,

      url: `${baseUrl}/${locale}/team`,

      type: 'website',

      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },

    twitter: {
      card: 'summary_large_image',

      title: titles[locale as 'zh' | 'en'] || titles.zh,

      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    },

    alternates: {
      canonical: `${baseUrl}/${locale}/team`,

      languages: {
        'zh-CN': `${baseUrl}/zh/team`,

        'en-US': `${baseUrl}/en/team`,
      },
    },
  }
}

// 团队成员数据

const teamMembers = [
  {
    id: 1,
    emoji: '🌟',
    color: 'from-yellow-400 to-orange-500',
    key: 'expert',
    category: 'strategy',
  },

  {
    id: 2,
    emoji: '📚',
    color: 'from-blue-400 to-indigo-600',
    key: 'consultant',
    category: 'strategy',
  },

  { id: 3, emoji: '🏗️', color: 'from-purple-400 to-pink-600', key: 'architect', category: 'tech' },

  { id: 4, emoji: '⚡', color: 'from-green-400 to-emerald-600', key: 'executor', category: 'tech' },

  { id: 5, emoji: '🛡️', color: 'from-red-400 to-rose-600', key: 'admin', category: 'tech' },

  { id: 6, emoji: '🧪', color: 'from-cyan-400 to-teal-600', key: 'tester', category: 'tech' },

  { id: 7, emoji: '🎨', color: 'from-pink-400 to-rose-500', key: 'designer', category: 'creative' },

  {
    id: 8,
    emoji: '📣',
    color: 'from-amber-400 to-yellow-600',
    key: 'promoter',
    category: 'creative',
  },

  {
    id: 9,
    emoji: '💼',
    color: 'from-violet-400 to-purple-600',
    key: 'sales',
    category: 'business',
  },

  {
    id: 10,
    emoji: '💰',
    color: 'from-emerald-400 to-green-600',
    key: 'finance',
    category: 'business',
  },

  { id: 11, emoji: '📺', color: 'from-sky-400 to-blue-600', key: 'media', category: 'creative' },
]

export default async function TeamPage({ params }: { params: Params }) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    // notFound()
  }

  setRequestLocale(locale)

  const tNav = await getTranslations({ locale, namespace: 'nav' })

  const tTeam = await getTranslations({ locale, namespace: 'team' })

  const tMembers = await getTranslations({ locale, namespace: 'team.members' })

  const tFooter = await getTranslations({ locale, namespace: 'footer' })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
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
              <Link
                href="/about"
                className="text-zinc-600 transition-colors hover:text-cyan-500 dark:text-zinc-400"
              >
                {tNav('about')}
              </Link>

              <Link href="/team" className="font-medium text-cyan-500">
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

      {/* Hero */}

      <section className="bg-gradient-to-br from-cyan-900 via-purple-900 to-zinc-900 px-6 pt-32 pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-cyan-400 backdrop-blur-sm">
            <span className="animate-pulse">✨</span>

            {tTeam('hero.badge')}
          </div>

          <h1 className="mb-6 text-4xl font-bold text-white md:text-6xl">{tTeam('hero.title')}</h1>

          <p className="mx-auto mb-12 max-w-2xl text-xl text-zinc-300">
            {tTeam('hero.description')}
          </p>

          {/* Stats */}

          <div className="mx-auto grid max-w-2xl grid-cols-3 gap-4 sm:gap-8">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-sm">
              <div className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                {tTeam('hero.stats.members.value')}
              </div>

              <div className="mt-1 text-sm text-zinc-300">{tTeam('hero.stats.members.label')}</div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-sm">
              <div className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                {tTeam('hero.stats.coverage.value')}
              </div>

              <div className="mt-1 text-sm text-zinc-300">{tTeam('hero.stats.coverage.label')}</div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-sm">
              <div className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                {tTeam('hero.stats.support.value')}
              </div>

              <div className="mt-1 text-sm text-zinc-300">{tTeam('hero.stats.support.label')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Members Grid */}

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map(member => (
              <div
                key={member.id}
                className="group relative rounded-2xl bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:bg-zinc-900"
              >
                {/* Gradient border effect */}

                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${member.color} -z-10 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100`}
                  aria-hidden="true"
                />

                <div
                  className="absolute inset-0 -z-10 rounded-2xl bg-white transition-colors duration-300 group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-800"
                  aria-hidden="true"
                />

                <div className="mb-4 text-5xl" aria-hidden="true">
                  {member.emoji}
                </div>

                <h3 className="mb-1 text-xl font-bold text-zinc-900 dark:text-white">
                  {tMembers(`${member.key}.name`)}
                </h3>

                <p
                  className={`bg-gradient-to-r text-sm font-medium ${member.color} mb-4 bg-clip-text text-transparent`}
                >
                  {tMembers(`${member.key}.role`)}
                </p>

                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {tMembers(`${member.key}.description`)}
                </p>

                {/* Skills */}

                <div className="mt-4 flex flex-wrap gap-2">
                  {(tMembers.raw(`${member.key}.skills`) as string[])?.map(
                    (skill: string, i: number) => (
                      <span
                        key={i}
                        className={`rounded-full bg-gradient-to-r px-2 py-1 text-xs ${member.color} text-white/90`}
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration Mode */}

      <section className="bg-white px-6 py-20 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-zinc-900 md:text-4xl dark:text-white">
              {tTeam('collaboration.title')}
            </h2>

            <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">
              {tTeam('collaboration.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {['strategy', 'design', 'testing', 'promotion'].map(key => {
              const colors = {
                strategy: 'from-cyan-500 to-blue-600',

                design: 'from-purple-500 to-pink-600',

                testing: 'from-green-500 to-emerald-600',

                promotion: 'from-amber-500 to-orange-600',
              }

              const emojis = { strategy: '🎯', design: '🎨', testing: '🧪', promotion: '📈' }

              return (
                <div
                  key={key}
                  className="group rounded-2xl bg-zinc-50 p-6 transition-all duration-300 hover:shadow-lg dark:bg-zinc-800"
                >
                  <div
                    className={`h-12 w-12 rounded-xl bg-gradient-to-br ${colors[key as keyof typeof colors]} mb-4 flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110`}
                    aria-hidden="true"
                  >
                    {emojis[key as keyof typeof emojis]}
                  </div>

                  <h3 className="mb-2 font-bold text-zinc-900 dark:text-white">
                    {tTeam(`collaboration.items.${key}.title`)}
                  </h3>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {tTeam(`collaboration.items.${key}.description`)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}

      <section className="bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">{tTeam('cta.title')}</h2>

          <p className="mb-8 text-xl text-white/80">{tTeam('cta.description')}</p>

          <Link
            href="/contact"
            className="group inline-flex items-center gap-3 rounded-full bg-white px-10 py-5 text-lg font-semibold text-cyan-600 transition-all duration-300 hover:scale-105 hover:bg-cyan-50 hover:shadow-2xl"
          >
            {tTeam('cta.button')}

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

      {/* Structured Data for Team Page */}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',

            '@type': 'CollectionPage',

            name: locale === 'zh' ? '7zi Studio 团队成员' : '7zi Studio Team Members',

            description:
              locale === 'zh'
                ? '11 位专业的 AI 代理团队介绍'
                : 'Introduction to our 11 professional AI agents',

            url: `${baseUrl}/${locale}/team`,

            mainEntity: {
              '@type': 'ItemList',

              numberOfItems: teamMembers.length,

              itemListElement: teamMembers.map((member, index) => ({
                '@type': 'ListItem',

                position: index + 1,

                item: {
                  '@type': 'Person',

                  name: tMembers(`${member.key}.name`),

                  jobTitle: tMembers(`${member.key}.role`),

                  description: tMembers(`${member.key}.description`),
                },
              })),
            },
          }),
        }}
      />
    </div>
  )
}
