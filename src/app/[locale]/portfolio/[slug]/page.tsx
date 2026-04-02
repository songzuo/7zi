import { setRequestLocale, getTranslations } from 'next-intl/server'
import { Locale, locales } from '@/i18n/config'
import { Link } from '@/i18n/routing'
import { ThemeToggle } from '@/components/ThemeToggle'
import MobileMenu from '@/components/MobileMenu'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { StructuredData } from '@/components/SEO'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProjectBySlug, getRelatedProjects } from '../data'
import ProjectCard from '../components/ProjectCard'

type Params = Promise<{ locale: string; slug: string }>

const baseUrl = 'https://7zi.studio'

// 禁用静态生成，改用动态渲染
// export async function generateStaticParams() {
//   return locales.flatMap(locale =>
//     projects.map(project => ({
//       locale,
//       slug: project.slug,
//     }))
//   );
// }

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params
  const project = getProjectBySlug(slug)

  if (!project) {
    return {
      title: 'Project Not Found',
    }
  }

  const title = locale === 'zh' ? project.titleZh : project.title
  const description = locale === 'zh' ? project.descriptionZh : project.description

  return {
    title: `${title} - 7zi Studio`,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}/portfolio/${slug}`,
      type: 'website',
      images: [project.thumbnail],
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [project.thumbnail],
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/portfolio/${slug}`,
      languages: {
        'zh-CN': `${baseUrl}/zh/portfolio/${slug}`,
        'en-US': `${baseUrl}/en/portfolio/${slug}`,
      },
    },
  }
}

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params

  if (!locales.includes(locale as Locale)) {
    // notFound()
  }

  setRequestLocale(locale)

  const tNav = await getTranslations({ locale, namespace: 'nav' })
  const tPortfolio = await getTranslations({ locale, namespace: 'portfolio' })

  const project = getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  const title = locale === 'zh' ? project.titleZh : project.title
  const description = locale === 'zh' ? project.descriptionZh : project.description
  const highlights = locale === 'zh' ? project.highlightsZh : project.highlights

  const relatedProjects = getRelatedProjects(slug, project.category, 3)

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
              <Link href="/portfolio" className="font-medium text-cyan-500">
                {tNav('portfolio')}
              </Link>
              <Link
                href="/blog"
                className="text-zinc-600 transition-colors hover:text-cyan-500 dark:text-zinc-400"
              >
                {tNav('blog')}
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
        <div className="mx-auto max-w-4xl">
          {/* Back Button */}
          <Link
            href="/portfolio"
            className="mb-8 inline-flex items-center gap-2 text-zinc-300 transition-colors hover:text-white"
          >
            <span aria-hidden="true">←</span>
            {tPortfolio('detail.backToList')}
          </Link>

          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">{title}</h1>
          <p className="mb-8 text-xl text-zinc-300">{description}</p>

          {/* Project Info */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {project.client && (
              <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm dark:bg-zinc-900/20">
                <div className="mb-1 text-sm text-zinc-400">{tPortfolio('detail.client')}</div>
                <div className="font-medium text-white">{project.client}</div>
              </div>
            )}
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm dark:bg-zinc-900/20">
              <div className="mb-1 text-sm text-zinc-400">{tPortfolio('detail.duration')}</div>
              <div className="font-medium text-white">{project.duration}</div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm dark:bg-zinc-900/20">
              <div className="mb-1 text-sm text-zinc-400">{tPortfolio('detail.year')}</div>
              <div className="font-medium text-white">{project.year}</div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm dark:bg-zinc-900/20">
              <div className="mb-1 text-sm text-zinc-400">{tPortfolio('detail.category')}</div>
              <div className="font-medium text-white uppercase">{project.category}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Image */}
      <section className="bg-white px-6 py-12 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl">
          <div className="relative aspect-video overflow-hidden rounded-2xl shadow-2xl">
            <Image
              src={project.thumbnail}
              alt={title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
          </div>
        </div>
      </section>

      {/* Highlights & Tech Stack */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 md:grid-cols-2">
            {/* Highlights */}
            <div>
              <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
                {tPortfolio('detail.highlights')}
              </h2>
              <ul className="space-y-4">
                {highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-sm text-white"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tech Stack */}
            <div>
              <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
                {tPortfolio('detail.techStack')}
              </h2>
              <div className="flex flex-wrap gap-3">
                {project.techStack.map(tech => (
                  <span
                    key={tech}
                    className="rounded-lg bg-zinc-100 px-4 py-2 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Links */}
              <div className="mt-8 flex flex-wrap gap-4">
                {project.links.live && (
                  <a
                    href={project.links.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25"
                  >
                    {tPortfolio('detail.visitSite')}
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
                {project.links.github && (
                  <a
                    href={project.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-6 py-3 font-medium text-white transition-all hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                  >
                    GitHub
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots */}
      {project.images.length > 0 && (
        <section className="bg-white px-6 py-16 dark:bg-zinc-900">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">
              {tPortfolio('detail.screenshots')}
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {project.images.map((image, index) => (
                <div
                  key={index}
                  className="relative aspect-video overflow-hidden rounded-xl shadow-lg"
                >
                  <Image
                    src={image}
                    alt={`${title} screenshot ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Projects */}
      {relatedProjects.length > 0 && (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">
              {tPortfolio('detail.relatedProjects')}
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {relatedProjects.map(relatedProject => (
                <ProjectCard
                  key={relatedProject.id}
                  project={relatedProject}
                  locale={locale}
                  labels={{
                    viewDetails: tPortfolio('card.viewDetails'),
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            {tPortfolio('cta.title')}
          </h2>
          <p className="mb-8 text-xl text-white/80">{tPortfolio('cta.description')}</p>
          <Link
            href="/contact"
            className="group inline-flex items-center gap-3 rounded-full bg-white px-10 py-5 text-lg font-semibold text-cyan-600 transition-all duration-300 hover:scale-105 hover:bg-cyan-50 hover:shadow-2xl"
          >
            {tPortfolio('cta.button')}
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
            <div className="text-sm">© 2024 7zi Studio. All rights reserved.</div>
          </div>
        </div>
      </footer>

      {/* Structured Data for Project */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            name: title,
            description: description,
            image: [project.thumbnail, ...project.images],
            dateCreated: project.year,
            author: {
              '@type': 'Organization',
              name: '7zi Studio',
              url: baseUrl,
            },
            ...(project.client && {
              client: {
                '@type': 'Organization',
                name: project.client,
              },
            }),
          }),
        }}
      />
    </div>
  )
}
