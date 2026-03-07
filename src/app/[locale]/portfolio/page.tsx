import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { ClientProviders, ThemeToggle } from '@/components/ClientProviders';
import MobileMenu from '@/components/MobileMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { StructuredData } from '@/components/SEO';
import type { Metadata } from 'next';
import { projects, ProjectCategory } from './data';
import PortfolioGrid from './components/PortfolioGrid';
import CategoryFilter from './components/CategoryFilter';

type Params = Promise<{ locale: string }>;

const baseUrl = 'https://7zi.studio';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  
  const titles = {
    zh: '作品案例 - 7zi Studio 项目展示',
    en: 'Portfolio - 7zi Studio Projects',
  };
  
  const descriptions = {
    zh: '7zi Studio 作品案例展示 - 网站开发、移动应用、AI 解决方案、品牌设计，每一个项目都是我们对品质的追求。',
    en: '7zi Studio portfolio showcase - From web development to AI solutions, every project represents our commitment to quality.',
  };

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      url: `${baseUrl}/${locale}/portfolio`,
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/portfolio`,
      languages: {
        'zh-CN': `${baseUrl}/zh/portfolio`,
        'en-US': `${baseUrl}/en/portfolio`,
      },
    },
  };
}

export default async function PortfolioPage({ 
  params,
  searchParams 
}: { 
  params: Params;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  
  if (!locales.includes(locale as Locale)) {
    // notFound()
  }
  
  setRequestLocale(locale);
  
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tPortfolio = await getTranslations({ locale, namespace: 'portfolio' });

  // Filter projects by category
  const activeCategory: ProjectCategory | 'all' = (category as ProjectCategory) || 'all';
  const filteredProjects = activeCategory === 'all' 
    ? projects 
    : projects.filter(p => p.category === activeCategory);

  return (
    <ClientProviders>
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
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-cyan-400 text-sm font-medium mb-6 border border-white/20">
              <span className="animate-pulse">✨</span>
              {tPortfolio('hero.badge')}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {tPortfolio('hero.title')}
            </h1>
            <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
              {tPortfolio('hero.description')}
            </p>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-12 px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto">
            <CategoryFilter 
              activeCategory={activeCategory}
              onCategoryChange={(_cat) => {
                // Client-side navigation will be handled by the component
              }}
              labels={{
                all: tPortfolio('categories.all'),
                website: tPortfolio('categories.website'),
                app: tPortfolio('categories.app'),
                ai: tPortfolio('categories.ai'),
                design: tPortfolio('categories.design'),
              }}
            />
          </div>
        </section>

        {/* Portfolio Grid */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <PortfolioGrid
              projects={filteredProjects}
              locale={locale}
              labels={{
                viewDetails: tPortfolio('card.viewDetails'),
              }}
              emptyMessage={{
                title: tPortfolio('empty.title'),
                description: tPortfolio('empty.description'),
              }}
            />
          </div>
        </section>

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

        {/* Structured Data for Portfolio Page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: locale === 'zh' ? "7zi Studio 作品案例" : "7zi Studio Portfolio",
              description: locale === 'zh' ? "网站开发、移动应用、AI 解决方案、品牌设计项目展示" : "Web development, mobile apps, AI solutions, and brand design projects",
              url: `${baseUrl}/${locale}/portfolio`,
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: projects.length,
                itemListElement: projects.map((project, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  item: {
                    "@type": "CreativeWork",
                    name: locale === 'zh' ? project.titleZh : project.title,
                    description: locale === 'zh' ? project.descriptionZh : project.description,
                    image: project.thumbnail,
                  },
                })),
              },
            }),
          }}
        />
      </div>
    </ClientProviders>
  );
}
