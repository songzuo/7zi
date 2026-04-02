import { setRequestLocale, getTranslations } from 'next-intl/server'

import { Locale, locales } from '@/i18n/config'

import { Link } from '@/i18n/routing'

import MobileMenu from '@/components/MobileMenu'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'

import { ThemeToggle } from '@/components/ThemeToggle'

import { StructuredData } from '@/components/SEO'

import { ContactForm } from '@/components/ContactForm'

import { SocialLinks } from '@/components/SocialLinks'

import type { Metadata } from 'next'

type Params = Promise<{ locale: string }>

// ISR: Revalidate every 1 hour
export const revalidate = 3600 // 1小时

const baseUrl = 'https://7zi.studio'

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params

  const titles = {
    zh: '联系我们 - 获取专业数字化服务',

    en: 'Contact Us - Get Professional Digital Services',
  }

  const keywords = {
    zh: ['7zi Studio', '联系我们', '联系', '咨询', '商务合作', 'AI 服务', '数字化解决方案'],
    en: [
      '7zi Studio',
      'Contact Us',
      'Contact',
      'Consultation',
      'Business Collaboration',
      'AI Services',
      'Digital Solutions',
    ],
  }

  const descriptions = {
    zh: '联系 7zi Studio - AI 驱动的创新数字工作室。商务合作、技术支持、项目咨询，我们 24 小时内回复。',

    en: 'Contact 7zi Studio - AI-powered digital innovation studio. Business cooperation, technical support, project consultation. We respond within 24 hours.',
  }

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,

    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    keywords: keywords[locale as 'zh' | 'en'] || keywords.zh,

    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,

      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,

      url: `${baseUrl}/${locale}/contact`,

      type: 'website',

      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },

    twitter: {
      card: 'summary_large_image',

      title: titles[locale as 'zh' | 'en'] || titles.zh,

      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    },

    alternates: {
      canonical: `${baseUrl}/${locale}/contact`,

      languages: {
        'zh-CN': `${baseUrl}/zh/contact`,

        'en-US': `${baseUrl}/en/contact`,
      },
    },
  }
}

// 联系方式信息

const contactInfo = [
  { emoji: '📧', key: 'business' },

  { emoji: '💻', key: 'support' },

  { emoji: '🤝', key: 'careers' },
]

export default async function ContactPage({ params }: { params: Params }) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    // notFound()
  }

  setRequestLocale(locale)

  const tNav = await getTranslations({ locale, namespace: 'nav' })

  const tContact = await getTranslations({ locale, namespace: 'contact' })

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

      <section className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-black px-6 py-24 pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold text-white md:text-6xl">
            {tContact('hero.title')}{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              7zi Studio
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-zinc-300 md:text-2xl">
            {tContact('hero.description')}
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact Form */}

            <div className="rounded-2xl bg-white p-8 shadow-xl md:p-12 dark:bg-zinc-900">
              <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
                {tContact('form.title')}
              </h2>

              <ContactForm locale={locale as 'zh' | 'en'} />
            </div>

            {/* Contact Info */}

            <div className="space-y-8">
              {/* Email Cards */}

              <div className="rounded-2xl bg-white p-8 shadow-xl md:p-12 dark:bg-zinc-900">
                <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
                  {tContact('info.title')}
                </h2>

                <div className="space-y-6">
                  {contactInfo.map(info => (
                    <div key={info.key} className="flex items-start gap-4">
                      <div className="text-3xl" aria-hidden="true">
                        {info.emoji}
                      </div>

                      <div>
                        <h3 className="mb-1 font-bold text-zinc-900 dark:text-white">
                          {tContact(`info.${info.key}.title`)}
                        </h3>

                        <a
                          href={`mailto:${tContact(`info.${info.key}.email`)}`}
                          className="text-cyan-500 transition-colors hover:text-cyan-600"
                        >
                          {tContact(`info.${info.key}.email`)}
                        </a>

                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {tContact(`info.${info.key}.description`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links */}

              <div className="rounded-2xl bg-white p-8 shadow-xl md:p-12 dark:bg-zinc-900">
                <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
                  {tContact('social.title')}
                </h2>

                <SocialLinks variant="grid" size="md" />
              </div>

              {/* Response Time */}

              <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 p-8 text-white">
                <h3 className="mb-2 text-xl font-bold">{tContact('response.title')}</h3>

                <p className="text-white/80">{tContact('response.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}

      <section className="bg-white px-6 py-20 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            {tContact('faq.title')}
          </h2>

          <div className="space-y-6">
            {(tContact.raw('faq.items') as Array<{ question: string; answer: string }>)?.map(
              (faq, index) => (
                <details
                  key={index}
                  className="group overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-800"
                >
                  <summary className="touch-active flex min-h-[48px] cursor-pointer list-none items-center justify-between p-6 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700">
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {faq.question}
                    </span>

                    <span
                      className="ml-4 flex-shrink-0 text-cyan-500 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>

                  <div className="px-6 pb-6 text-zinc-600 dark:text-zinc-400">{faq.answer}</div>
                </details>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}

      <section className="bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            {tContact('cta.title')}
          </h2>

          <p className="mb-8 text-xl text-white/80">{tContact('cta.description')}</p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="mailto:business@7zi.studio"
              className="touch-active inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-cyan-600 transition-colors hover:bg-cyan-50"
            >
              {tContact('cta.emailButton')}

              <span aria-hidden="true">✉️</span>
            </a>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
            >
              {tContact('cta.homeButton')}
            </Link>
          </div>
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

      {/* Structured Data for Contact Page */}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',

            '@type': 'ContactPage',

            name: locale === 'zh' ? '联系 7zi Studio' : 'Contact 7zi Studio',

            description: tContact('description'),

            url: `${baseUrl}/${locale}/contact`,

            mainEntity: {
              '@type': 'Organization',

              name: '7zi Studio',

              url: baseUrl,

              contactPoint: contactInfo.map(info => ({
                '@type': 'ContactPoint',

                contactType: tContact(`info.${info.key}.title`),

                email: tContact(`info.${info.key}.email`),

                description: tContact(`info.${info.key}.description`),
              })),
            },
          }),
        }}
      />
    </div>
  )
}
