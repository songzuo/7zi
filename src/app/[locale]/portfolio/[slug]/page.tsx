import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { ClientProviders, ThemeToggle } from '@/components/ClientProviders';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StructuredData } from '@/components/SEO';
import { getProjectBySlug, projects } from '@/data/projects';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Params = Promise<{ locale: string; slug: string }>;

const baseUrl = 'https://7zi.studio';

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    projects.map((project) => ({
      locale,
      slug: project.slug,
    }))
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = getProjectBySlug(slug);
  
  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }
  
  const title = locale === 'zh' ? `${project.title} - 项目案例` : `${project.title} - Portfolio`;
  const description = project.description;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}/portfolio/${slug}`,
      type: 'article',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      images: [
        {
          url: project.thumbnail,
          width: 1200,
          height: 630,
          alt: project.title,
        },
      ],
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

const categoryColors: Record<string, string> = {
  website: 'from-blue-400 to-cyan-500',
  app: 'from-purple-400 to-pink-500',
  ai: 'from-green-400 to-emerald-500',
  design: 'from-orange-400 to-red-500',
};

const categoryLabels: Record<string, { zh: string; en: string }> = {
  website: { zh: '网站', en: 'Website' },
  app: { zh: '应用', en: 'App' },
  ai: { zh: 'AI', en: 'AI' },
  design: { zh: '设计', en: 'Design' },
};

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  setRequestLocale(locale);
  
  const project = getProjectBySlug(slug);
  
  if (!project) {
    notFound();
  }

  const tNav = await getTranslations({ locale, namespace: 'nav' });

  // Get related projects (same category, exclude current)
  const relatedProjects = projects
    .filter(p => p.category === project.category && p.id !== project.id)
    .slice(0, 3);

  return (
    <ClientProviders>
      <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">
        {/* SEO Structured Data */}
        <StructuredData
          locale={locale as 'zh' | 'en'}
          schemas={['website', 'organization']}
          customSchemas={[
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: project.title,
              description: project.description,
              image: project.thumbnail,
              author: {
                '@type': 'Organization',
                name: '7zi Studio',
              },
            },
          ]}
        />

        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white touch-feedback">
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
                <Link href="/portfolio" className="text-cyan-500 font-medium">
                  {locale === 'zh' ? '作品' : 'Portfolio'}
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
              
              <div className="flex lg:hidden items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
                <MobileMenu />
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Image */}
        <section className="relative pt-24 sm:pt-28">
          <div className="aspect-video sm:aspect-[21/9] w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
            <img
              src={project.thumbnail}
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-black via-transparent to-transparent" />
          </div>
          
          {/* Back Button */}
          <div className="absolute top-28 sm:top-32 left-4 sm:left-8">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 transition-colors shadow-lg"
            >
              <span aria-hidden="true">←</span>
              {locale === 'zh' ? '返回作品集' : 'Back to Portfolio'}
            </Link>
          </div>
        </section>

        {/* Content */}
        <section className="relative -mt-20 sm:-mt-32 z-10 pb-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-6 sm:p-10">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${categoryColors[project.category]} mb-4`}>
                    {locale === 'zh' ? categoryLabels[project.category].zh : categoryLabels[project.category].en}
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
                    {project.title}
                  </h1>
                </div>
                
                {/* Links */}
                <div className="flex gap-3">
                  {project.links.live && (
                    <a
                      href={project.links.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full text-sm font-medium hover:shadow-lg transition-all"
                    >
                      {locale === 'zh' ? '访问网站' : 'Visit Site'}
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {project.links.github && (
                    <a
                      href={project.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full text-sm font-medium hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    >
                      GitHub
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
                {project.description}
              </p>

              {/* Meta Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-10">
                {project.client && (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                    <div className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                      {locale === 'zh' ? '客户' : 'Client'}
                    </div>
                    <div className="font-medium text-zinc-900 dark:text-white">
                      {project.client}
                    </div>
                  </div>
                )}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  <div className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                    {locale === 'zh' ? '周期' : 'Duration'}
                  </div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {project.duration}
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  <div className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                    {locale === 'zh' ? '类别' : 'Category'}
                  </div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {locale === 'zh' ? categoryLabels[project.category].zh : categoryLabels[project.category].en}
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  <div className="text-sm text-zinc-500 dark:text-zinc-500 mb-1">
                    {locale === 'zh' ? '年份' : 'Year'}
                  </div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    2024
                  </div>
                </div>
              </div>

              {/* Highlights */}
              <div className="mb-10">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  {locale === 'zh' ? '项目亮点' : 'Highlights'}
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                        ✓
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tech Stack */}
              <div className="mb-10">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  {locale === 'zh' ? '技术栈' : 'Tech Stack'}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Gallery */}
              {project.images.length > 1 && (
                <div className="mb-10">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                    {locale === 'zh' ? '项目截图' : 'Screenshots'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project.images.map((image, index) => (
                      <div key={index} className="aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                        <img
                          src={image}
                          alt={`${project.title} screenshot ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonial */}
              {project.testimonial && (
                <div className="mb-10">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                    {locale === 'zh' ? '客户评价' : 'Client Testimonial'}
                  </h2>
                  <div className="relative p-6 sm:p-8 bg-gradient-to-r from-cyan-50 to-purple-50 dark:from-cyan-900/20 dark:to-purple-900/20 rounded-2xl">
                    <div className="absolute top-4 left-4 text-6xl text-cyan-500/20 font-serif">"</div>
                    <blockquote className="relative z-10">
                      <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-4 italic">
                        {project.testimonial.content}
                      </p>
                      <footer className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {project.testimonial.author[0]}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-white">
                            {project.testimonial.author}
                          </div>
                          {project.testimonial.role && (
                            <div className="text-sm text-zinc-500 dark:text-zinc-500">
                              {project.testimonial.role}
                            </div>
                          )}
                        </div>
                      </footer>
                    </blockquote>
                  </div>
                </div>
              )}
            </div>

            {/* Related Projects */}
            {relatedProjects.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                  {locale === 'zh' ? '相关项目' : 'Related Projects'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedProjects.map((relatedProject) => (
                    <Link
                      key={relatedProject.id}
                      href={`/portfolio/${relatedProject.slug}`}
                      className="group bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all"
                    >
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={relatedProject.thumbnail}
                          alt={relatedProject.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-zinc-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                          {relatedProject.title}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1 line-clamp-1">
                          {relatedProject.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </ClientProviders>
  );
}