import { setRequestLocale, getTranslations } from 'next-intl/server'

import { Locale, locales } from '@/i18n/config'

import { Link } from '@/i18n/routing'

// 性能优化：使用 Lazy Loading 组件

import { LazyAIChat, LazyGitHubActivity, LazyProjectDashboard } from '@/components/LazyComponents'

import MobileMenu from '@/components/MobileMenu'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'

import { ThemeToggle } from '@/components/ThemeToggle'

import { StructuredData } from '@/components/SEO'

import type { Metadata } from 'next'

type Params = Promise<{ locale: string }>

const baseUrl = 'https://7zi.studio'

// 动态 SEO 元数据

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params

  const titles = {
    zh: '首页 - AI 驱动的创新数字工作室',

    en: 'Home - AI-Powered Digital Innovation Studio',
  }

  const descriptions = {
    zh: '7zi Studio 由 11 位专业 AI 代理组成，提供网站开发、品牌设计、营销推广等全方位数字化服务。高效、专业、创新，助您打造卓越数字产品。',

    en: '7zi Studio consists of 11 professional AI agents, providing comprehensive digital services including web development, brand design, and marketing. Efficient, professional, innovative.',
  }

  const keywords = {
    zh: [
      'AI 数字工作室',
      '网站开发',
      '品牌设计',
      '数字化服务',
      'AI 团队',
      '智能代理',
      '一站式解决方案',
    ],

    en: [
      'AI Digital Studio',
      'Web Development',
      'Brand Design',
      'Digital Services',
      'AI Team',
      'Intelligent Agents',
      'One-stop Solution',
    ],
  }

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
          url: `${baseUrl}/og-image.svg`,

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

      images: [`${baseUrl}/og-image.svg`],
    },

    alternates: {
      canonical: `${baseUrl}/${locale}`,

      languages: {
        'zh-CN': `${baseUrl}/zh`,

        'en-US': `${baseUrl}/en`,
      },
    },
  }
}

// Pre-generated particle positions (avoid Math.random() in render)

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 5 + (i % 3) * 15) % 100}%`,

  top: `${(i * 7 + (i % 5) * 8) % 100}%`,

  animationDelay: `${(i * 0.15) % 3}s`,

  animationDuration: `${2 + (i % 4) * 0.5}s`,
}))

// Pre-generated CTA background particles

const CTA_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  left: `${(i * 6.67) % 100}%`,

  top: `${(i * 7.5 + (i % 3) * 10) % 100}%`,

  animationDelay: `${(i * 0.13) % 2}s`,

  animationDuration: `${1 + (i % 3) * 0.5}s`,
}))

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params

  // 验证 locale

  if (!locales.includes(locale as Locale)) {
    // notFound() - 暂时跳过验证
  }

  setRequestLocale(locale)

  const tNav = await getTranslations({ locale, namespace: 'nav' })

  const tHero = await getTranslations({ locale, namespace: 'home.hero' })

  const tStats = await getTranslations({ locale, namespace: 'home.hero.stats' })

  const tTeamPreview = await getTranslations({ locale, namespace: 'home.teamPreview' })

  const tServices = await getTranslations({ locale, namespace: 'home.services' })

  const tWhyUs = await getTranslations({ locale, namespace: 'home.whyUs' })

  const tCta = await getTranslations({ locale, namespace: 'home.cta' })

  const tFooter = await getTranslations({ locale, namespace: 'footer' })

  // 首页 FAQ 数据（常见问题）

  const faqs =
    locale === 'zh'
      ? [
          {
            question: '7zi Studio 是什么？',

            answer:
              '7zi Studio 是由 11 位专业 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务。我们的 AI 团队可以高效协作，为您打造卓越的数字产品。',
          },

          {
            question: 'AI 团队能提供哪些服务？',

            answer:
              '我们的 AI 团队提供：网站开发（前端/后端/全栈）、UI/UX 设计、品牌设计、SEO 优化、内容营销、项目管理、测试调试、运维部署、财务咨询、媒体宣传、销售客服等一站式服务。',
          },

          {
            question: 'AI 服务和传统服务有什么区别？',

            answer:
              'AI 服务具有以下优势：24/7 在线、高效响应、成本更低、快速迭代、专业分工、数据驱动决策。相比传统服务，我们可以更快速地完成项目，并提供更专业的建议。',
          },

          {
            question: '如何开始项目合作？',

            answer:
              '您可以通过我们的官网联系页面发起咨询，我们会安排专业的销售客服与您沟通需求，然后由架构师制定方案，最终由执行团队完成项目交付。全程透明，高效沟通。',
          },

          {
            question: '服务收费如何计算？',

            answer:
              '我们提供灵活的收费模式：项目制（按项目需求报价）、包月制（持续服务）、按需定制（灵活选择）。具体价格根据项目复杂度和工作量确定，欢迎咨询获取详细报价。',
          },
        ]
      : [
          {
            question: 'What is 7zi Studio?',

            answer:
              '7zi Studio is an innovative digital studio powered by 11 professional AI agents, providing comprehensive digital services including web development, brand design, and marketing. Our AI team collaborates efficiently to create outstanding digital products for you.',
          },

          {
            question: 'What services can the AI team provide?',

            answer:
              'Our AI team offers: web development (frontend/backend/full-stack), UI/UX design, brand design, SEO optimization, content marketing, project management, testing, deployment, financial consulting, media promotion, and customer support as a one-stop service.',
          },

          {
            question: "What's the difference between AI services and traditional services?",

            answer:
              'AI services have these advantages: 24/7 availability, efficient response, lower cost, rapid iteration, professional division of labor, and data-driven decisions. Compared to traditional services, we can complete projects faster and provide more professional recommendations.',
          },

          {
            question: 'How do I start a project collaboration?',

            answer:
              'You can initiate a consultation through our contact page. We will arrange a professional sales representative to discuss your needs, then our architect will create a plan, and finally our execution team will deliver the project. Full transparency and efficient communication.',
          },

          {
            question: 'How are service fees calculated?',

            answer:
              'We offer flexible pricing models: project-based (quoted based on requirements), monthly (ongoing service), and on-demand (flexible choice). Specific prices depend on project complexity and workload. Feel free to contact us for a detailed quote.',
          },
        ]

  return (
    <div className="min-h-screen bg-zinc-50 transition-colors duration-300 dark:bg-black">
      {/* SEO Structured Data for Homepage */}

      <StructuredData
        locale={locale as 'zh' | 'en'}
        schemas={['website', 'organization', 'faq']}
        faqs={faqs}
        customSchemas={[
          {
            '@context': 'https://schema.org',

            '@type': 'WebPage',

            name: locale === 'zh' ? '7zi Studio 首页' : '7zi Studio Homepage',

            description:
              locale === 'zh'
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
                className="touch-active min-h-[44px] rounded-lg px-4 py-2 text-zinc-600 transition-colors hover:text-cyan-500 active:scale-95 dark:text-zinc-400"
              >
                {tNav('about')}
              </Link>

              <Link
                href="/team"
                className="touch-active min-h-[44px] rounded-lg px-4 py-2 text-zinc-600 transition-colors hover:text-cyan-500 active:scale-95 dark:text-zinc-400"
              >
                {tNav('team')}
              </Link>

              <Link
                href="/blog"
                className="touch-active min-h-[44px] rounded-lg px-4 py-2 text-zinc-600 transition-colors hover:text-cyan-500 active:scale-95 dark:text-zinc-400"
              >
                {tNav('blog')}
              </Link>

              <a
                href="https://visa.7zi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="touch-active min-h-[44px] rounded-lg px-4 py-2 text-zinc-600 transition-colors hover:text-cyan-500 active:scale-95 dark:text-zinc-400"
              >
                {tNav('global')}
              </a>

              <Link
                href="/dashboard"
                className="touch-active min-h-[44px] rounded-lg px-4 py-2 text-zinc-600 transition-colors hover:text-cyan-500 active:scale-95 dark:text-zinc-400"
              >
                {tNav('dashboard')}
              </Link>

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

      <section
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 pt-20 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950"
        aria-labelledby="hero-title"
      >
        {/* Animated Background Grid */}

        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:4rem_4rem]"
          aria-hidden="true"
        />

        {/* Floating Orbs */}

        <div
          className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/20 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/20 blur-3xl delay-1000"
          aria-hidden="true"
        />

        <div
          className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 blur-3xl delay-500"
          aria-hidden="true"
        />

        {/* Animated Particles */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {PARTICLES.map((particle, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 animate-pulse rounded-full bg-cyan-500/30"
              style={particle}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          {/* Badge */}

          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-4 py-2 text-sm font-medium text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" aria-hidden="true" />

            <span className="hidden sm:inline">{tHero('badge')}</span>

            <span className="sm:hidden">{tHero('badgeShort')}</span>
          </div>

          {/* Heading */}

          <h1
            id="hero-title"
            className="mb-6 text-4xl leading-tight font-bold text-zinc-900 sm:text-5xl md:text-7xl lg:text-8xl dark:text-white"
          >
            {locale === 'zh' ? (
              <>
                {tHero('title1')}

                <br />

                <span className="animate-gradient inline-block bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-[length:200%_200%] bg-clip-text text-transparent transition-transform duration-300 hover:scale-105">
                  {tHero('title2')}
                </span>
              </>
            ) : (
              <>{tHero('title1Prefix')}</>
            )}
          </h1>

          <p className="mx-auto mb-8 line-clamp-3 max-w-3xl overflow-hidden text-lg break-words text-zinc-600 sm:line-clamp-none sm:text-xl md:mb-12 md:text-2xl dark:text-zinc-400">
            {tHero('description')}
          </p>

          {/* CTA Buttons */}

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/about"
              className="group touch-active relative inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 overflow-hidden rounded-full bg-zinc-900 px-6 py-4 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/25 sm:px-8 dark:bg-white dark:text-zinc-900"
            >
              <span className="relative z-10 flex items-center gap-2">
                {tHero('cta1')}

                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                  →
                </span>
              </span>

              <div
                className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/team"
              className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-zinc-300 px-6 py-4 text-lg font-semibold text-zinc-700 transition-all hover:-translate-y-1 hover:border-cyan-500 hover:text-cyan-500 sm:px-8 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-cyan-400 dark:hover:text-cyan-400"
            >
              {tHero('cta2')}

              <span className="transition-transform group-hover:rotate-45" aria-hidden="true">
                ↗
              </span>
            </Link>
          </div>

          {/* Stats */}

          <div
            className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4 sm:mt-20 sm:gap-8"
            role="region"
            aria-label="Statistics"
          >
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

        {/* Scroll Indicator */}

        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
          aria-hidden="true"
        >
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-zinc-400 p-2 transition-colors hover:border-cyan-500 dark:border-zinc-600">
            <div className="h-3 w-1.5 animate-pulse rounded-full bg-zinc-400 dark:bg-zinc-600" />
          </div>
        </div>
      </section>

      {/* Team Preview */}

      <section
        className="overflow-hidden bg-white px-6 py-16 sm:py-20 dark:bg-zinc-900"
        aria-labelledby="team-preview-title"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2
              id="team-preview-title"
              className="mb-4 text-2xl font-bold text-zinc-900 sm:text-3xl md:text-4xl dark:text-white"
            >
              {tTeamPreview('title')}
            </h2>

            <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">
              {tTeamPreview('description')}
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6"
            role="list"
          >
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
                className="group flex flex-col items-center gap-3 rounded-2xl bg-zinc-50 p-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl sm:p-6 dark:bg-zinc-800"
                role="listitem"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-3xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6`}
                  aria-hidden="true"
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

              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* GitHub Activity - Lazy Loaded */}

      <LazyGitHubActivity />

      {/* Project Dashboard - Lazy Loaded */}

      <LazyProjectDashboard />

      {/* Services */}

      <section
        className="bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent px-6 py-16 sm:py-20 dark:via-zinc-900/50"
        aria-labelledby="services-title"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2
              id="services-title"
              className="mb-4 text-2xl font-bold text-zinc-900 sm:text-3xl md:text-4xl dark:text-white"
            >
              {tServices('title')}
            </h2>

            <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">
              {tServices('description')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3" role="list">
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
                className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl sm:p-8 dark:bg-zinc-900"
                role="listitem"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${service.color} -z-10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100`}
                  aria-hidden="true"
                />

                <div
                  className={`h-14 w-14 rounded-2xl bg-gradient-to-br sm:h-16 sm:w-16 ${service.color} mb-6 flex items-center justify-center text-2xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 sm:text-3xl`}
                  aria-hidden="true"
                >
                  {service.emoji}
                </div>

                <h3 className="mb-3 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white">
                  {service.title}
                </h3>

                <p className="mb-4 text-zinc-600 dark:text-zinc-400">{service.desc}</p>

                <ul className="space-y-2" aria-label="Service features">
                  {service.features.map((feature: string) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden="true" />

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

      <section
        className="bg-white px-6 py-16 sm:py-20 dark:bg-zinc-900"
        aria-labelledby="why-us-title"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2
              id="why-us-title"
              className="mb-4 text-2xl font-bold text-zinc-900 sm:text-3xl md:text-4xl dark:text-white"
            >
              {tWhyUs('title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6" role="list">
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
                className="group flex items-start gap-4 rounded-2xl bg-zinc-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-zinc-800"
                role="listitem"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}
                  aria-hidden="true"
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

      {/* CTA Section */}

      <section
        className="animate-gradient relative overflow-hidden bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-[length:200%_200%] px-6 py-16 sm:py-20"
        aria-labelledby="cta-title"
      >
        <div className="absolute inset-0" aria-hidden="true">
          {CTA_PARTICLES.map((particle, i) => (
            <div
              key={i}
              className="absolute h-2 w-2 animate-pulse rounded-full bg-white/20"
              style={particle}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 id="cta-title" className="mb-6 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            {tCta('title')}
          </h2>

          <p className="mb-8 text-lg text-white/80 sm:text-xl">{tCta('description')}</p>

          <Link
            href="/contact"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-lg font-semibold text-cyan-600 transition-all hover:-translate-y-1 hover:bg-cyan-50 hover:shadow-xl sm:px-8"
          >
            {tCta('button')}

            <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* AI Chat Component - Lazy Loaded (SSR: false) */}

      <LazyAIChat />

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
