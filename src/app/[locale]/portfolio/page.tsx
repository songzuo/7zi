import { setRequestLocale, getTranslations } from 'next-intl/server';

import { Locale, locales } from '@/i18n/config';

import { Link } from '@/i18n/routing';



import MobileMenu from '@/components/MobileMenu';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';

import { ThemeToggle } from '@/components/ThemeToggle';

import { StructuredData } from '@/components/SEO';

import PortfolioGrid from './components/PortfolioGrid';

import { CategoryFilterWrapper } from './components/CategoryFilterWrapper';

import { projects } from './data';

import type { Metadata } from 'next';

import { Suspense } from 'react';



type Params = Promise<{ locale: string }>;



const baseUrl = 'https://7zi.studio';



export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {

  const { locale } = await params;

  

  const titles = {

    zh: '项目案例 - 作品展示',

    en: 'Portfolio - Our Work',

  };

  

  const descriptions = {

    zh: '7zi Studio 项目案例展示，包括网站开发、移动应用、AI 解决方案和品牌设计作品',

    en: '7zi Studio portfolio showcasing our web development, mobile apps, AI solutions, and brand design work',

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

  };

}



// Pre-generated particles

const HERO_PARTICLES = Array.from({ length: 12 }, (_, i) => ({

  left: `${(i * 8.33) % 100}%`,

  top: `${(i * 7 + 15) % 70}%`,

  animationDelay: `${(i * 0.2) % 2}s`,

  animationDuration: `${2 + (i % 3) * 0.5}s`,

}));



export default async function PortfolioPage({ params, searchParams }: { params: Params; searchParams: Promise<{ category?: string }> }) {

  const { locale } = await params;

  const { category } = await searchParams;

  

  if (!locales.includes(locale as Locale)) {

    // Handle invalid locale

  }

  

  setRequestLocale(locale);

  

  const tNav = await getTranslations({ locale, namespace: 'nav' });



  // Filter projects by category

  const activeCategory = category || 'all';

  const filteredProjects = activeCategory === 'all' 

    ? projects 

    : projects.filter(p => p.category === activeCategory);



  return (

      <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">

        {/* SEO Structured Data */}

        <StructuredData

          locale={locale as 'zh' | 'en'}

          schemas={['website', 'organization']}

          customSchemas={[

            {

              '@context': 'https://schema.org',

              '@type': 'CollectionPage',

              name: locale === 'zh' ? '7zi Studio 项目案例' : '7zi Studio Portfolio',

              description: locale === 'zh'

                ? '7zi Studio 项目案例展示'

                : '7zi Studio portfolio showcase',

              url: `${baseUrl}/${locale}/portfolio`,

            },

          ]}

        />



        {/* Navigation */}

        <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800" aria-label="Main navigation">

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">

            <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white touch-feedback" aria-label="7zi Studio Home">

              7zi<span className="text-cyan-500">Studio</span>

            </Link>

            <div className="flex items-center gap-2 sm:gap-4">

              {/* Desktop Navigation */}

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

                <a

                  href="https://visa.7zi.com"

                  target="_blank"

                  rel="noopener noreferrer"

                  className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors"

                >

                  {tNav('global')}

                </a>

                <ThemeToggle />

                <LanguageSwitcher />

                <Link

                  href="/contact"

                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all touch-feedback"

                >

                  {tNav('contact')}

                </Link>

              </div>

              

              {/* Mobile Navigation */}

              <div className="flex lg:hidden items-center gap-2">

                <LanguageSwitcher />

                <ThemeToggle />

                <MobileMenu />

              </div>

            </div>

          </div>

        </nav>



        {/* Hero Section */}

        <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20 px-6 overflow-hidden">

          {/* Background Effects */}

          <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />

          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" aria-hidden="true" />

          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" aria-hidden="true" />

          

          {/* Animated Particles */}

          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">

            {HERO_PARTICLES.map((particle, i) => (

              <div

                key={i}

                className="absolute w-1 h-1 bg-cyan-500/30 rounded-full animate-pulse"

                style={particle}

              />

            ))}

          </div>



          <div className="relative z-10 max-w-4xl mx-auto text-center">

            {/* Badge */}

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-6">

              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" aria-hidden="true" />

              {locale === 'zh' ? '精选案例' : 'Featured Work'}

            </div>

            

            {/* Heading */}

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white mb-6">

              {locale === 'zh' ? (

                <>

                  我们的作品

                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">展示</span>

                </>

              ) : (

                <>

                  Our{' '}

                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">Portfolio</span>

                </>

              )}

            </h1>

            

            <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">

              {locale === 'zh'

                ? '从网站开发到 AI 解决方案，每一个项目都是我们对品质的追求'

                : 'From web development to AI solutions, every project reflects our commitment to quality'}

            </p>



            {/* Stats */}

            <div className="flex justify-center gap-8 sm:gap-12 mt-10">

              <div className="text-center">

                <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">

                  {projects.length}+

                </div>

                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">

                  {locale === 'zh' ? '完成项目' : 'Projects'}

                </div>

              </div>

              <div className="text-center">

                <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">

                  100%

                </div>

                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">

                  {locale === 'zh' ? '客户满意' : 'Satisfaction'}

                </div>

              </div>

              <div className="text-center">

                <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">

                  24/7

                </div>

                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">

                  {locale === 'zh' ? '在线支持' : 'Support'}

                </div>

              </div>

            </div>

          </div>

        </section>



        {/* Category Filter */}

        <section className="px-6 pb-8">

          <div className="max-w-7xl mx-auto">

            <Suspense fallback={<div className="h-12" />}>

              <CategoryFilterWrapper locale={locale} activeCategory={activeCategory} />

            </Suspense>

          </div>

        </section>



        {/* Portfolio Grid */}

        <section className="px-6 pb-20">

          <div className="max-w-7xl mx-auto">

            <PortfolioGrid projects={filteredProjects} locale={locale} />

          </div>

        </section>



        {/* CTA Section */}

        <section className="py-16 sm:py-20 px-6 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%] relative overflow-hidden">

          <div className="max-w-3xl mx-auto text-center relative z-10">

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">

              {locale === 'zh' ? '准备好开始您的项目了吗？' : 'Ready to Start Your Project?'}

            </h2>

            <p className="text-lg sm:text-xl text-white/80 mb-8">

              {locale === 'zh'

                ? '让我们一起将您的想法变为现实'

                : "Let's bring your ideas to life together"}

            </p>

            <Link

              href="/contact"

              className="group inline-flex items-center justify-center gap-2 bg-white text-cyan-600 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-all hover:shadow-xl hover:-translate-y-1"

            >

              {locale === 'zh' ? '立即咨询' : 'Contact Us Now'}

              <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>

            </Link>

          </div>

        </section>

      </div>

  );

}
