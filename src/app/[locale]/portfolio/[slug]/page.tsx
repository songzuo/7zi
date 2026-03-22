import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { ThemeToggle } from '@/components/ThemeToggle';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StructuredData } from '@/components/SEO';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProjectBySlug, getRelatedProjects } from '../data';
import ProjectCard from '../components/ProjectCard';

type Params = Promise<{ locale: string; slug: string }>;

const baseUrl = 'https://7zi.studio';

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
  const { locale, slug } = await params;
  const project = getProjectBySlug(slug);
  
  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }
  
  const title = locale === 'zh' ? project.titleZh : project.title;
  const description = locale === 'zh' ? project.descriptionZh : project.description;

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
  };
}

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  
  if (!locales.includes(locale as Locale)) {
    // notFound()
  }
  
  setRequestLocale(locale);
  
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tPortfolio = await getTranslations({ locale, namespace: 'portfolio' });

  const project = getProjectBySlug(slug);
  
  if (!project) {
    notFound();
  }

  const title = locale === 'zh' ? project.titleZh : project.title;
  const description = locale === 'zh' ? project.descriptionZh : project.description;
  const highlights = locale === 'zh' ? project.highlightsZh : project.highlights;

  const relatedProjects = getRelatedProjects(slug, project.category, 3);

  return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800" aria-label="Main navigation">
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
                <Link href="/portfolio" className="text-cyan-500 font-medium">
                  {tNav('portfolio')}
                </Link>
                <Link href="/blog" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  {tNav('blog')}
                </Link>
                <ThemeToggle />
                <LanguageSwitcher />
                <Link
                  href="/contact"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
                >
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

        {/* SEO Structured Data */}
        <StructuredData
          locale={locale as 'zh' | 'en'}
          schemas={['website', 'organization']}
        />

        {/* Hero */}
        <section className="pt-32 pb-16 px-6 bg-gradient-to-br from-cyan-900 via-purple-900 to-zinc-900">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 text-zinc-300 hover:text-white mb-8 transition-colors"
            >
              <span aria-hidden="true">←</span>
              {tPortfolio('detail.backToList')}
            </Link>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {title}
            </h1>
            <p className="text-xl text-zinc-300 mb-8">
              {description}
            </p>

            {/* Project Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {project.client && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-sm text-zinc-400 mb-1">{tPortfolio('detail.client')}</div>
                  <div className="font-medium text-white">{project.client}</div>
                </div>
              )}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-sm text-zinc-400 mb-1">{tPortfolio('detail.duration')}</div>
                <div className="font-medium text-white">{project.duration}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-sm text-zinc-400 mb-1">{tPortfolio('detail.year')}</div>
                <div className="font-medium text-white">{project.year}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-sm text-zinc-400 mb-1">{tPortfolio('detail.category')}</div>
                <div className="font-medium text-white uppercase">{project.category}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Image */}
        <section className="py-12 px-6 bg-white dark:bg-zinc-900">
          <div className="max-w-5xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
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
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Highlights */}
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                  {tPortfolio('detail.highlights')}
                </h2>
                <ul className="space-y-4">
                  {highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm" aria-hidden="true">
                        ✓
                      </span>
                      <span className="text-zinc-600 dark:text-zinc-400">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tech Stack */}
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                  {tPortfolio('detail.techStack')}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium"
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
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
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
                      className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 dark:bg-zinc-700 text-white rounded-full font-medium hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-all"
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
          <section className="py-16 px-6 bg-white dark:bg-zinc-900">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">
                {tPortfolio('detail.screenshots')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {project.images.map((image, index) => (
                  <div key={index} className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                    <Image
                      src={image}
                      alt={`${title} screenshot ${index + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
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
          <section className="py-20 px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">
                {tPortfolio('detail.relatedProjects')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {relatedProjects.map((relatedProject) => (
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
        <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-purple-600">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {tPortfolio('cta.title')}
            </h2>
            <p className="text-xl text-white/80 mb-8">
              {tPortfolio('cta.description')}
            </p>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 bg-white text-cyan-600 px-10 py-5 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            >
              {tPortfolio('cta.button')}
              <span className="group-hover:translate-x-2 transition-transform duration-300" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

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
                © 2024 7zi Studio. All rights reserved.
              </div>
            </div>
          </div>
        </footer>

        {/* Structured Data for Project */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CreativeWork",
              name: title,
              description: description,
              image: [project.thumbnail, ...project.images],
              dateCreated: project.year,
              author: {
                "@type": "Organization",
                name: "7zi Studio",
                url: baseUrl,
              },
              ...(project.client && {
                client: {
                  "@type": "Organization",
                  name: project.client,
                },
              }),
            }),
          }}
        />
      </div>
  );
}
