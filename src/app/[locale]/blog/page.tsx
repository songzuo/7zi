import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Locale, locales } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { StructuredData } from '@/components/SEO';

type Params = Promise<{ locale: string }>;

const baseUrl = "https://7zi.studio";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  
  const titles = {
    zh: '博客 - AI 与数字化前沿洞察',
    en: 'Blog - AI & Digital Insights',
  };

  const keywords = {
    zh: ['7zi Studio', '博客', '技术文章', 'AI', 'Web 开发', '设计', '营销', 'SEO'],
    en: ['7zi Studio', 'Blog', 'Tech Articles', 'AI', 'Web Development', 'Design', 'Marketing', 'SEO'],
  };
  
  const descriptions = {
    zh: '7zi Studio 博客 - 分享 AI、数字化、Web 开发、设计、营销的最新见解和深度分析。',
    en: '7zi Studio Blog - Sharing insights on AI, digital transformation, web development, design, and marketing.',
  };

  return {
    title: titles[locale as 'zh' | 'en'] || titles.zh,
    description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    keywords: keywords[locale as 'zh' | 'en'] || keywords.zh,
    openGraph: {
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
      url: `${baseUrl}/${locale}/blog`,
      type: "website",
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: "summary_large_image",
      title: titles[locale as 'zh' | 'en'] || titles.zh,
      description: descriptions[locale as 'zh' | 'en'] || descriptions.zh,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/blog`,
      languages: {
        'zh-CN': `${baseUrl}/zh/blog`,
        'en-US': `${baseUrl}/en/blog`,
      },
    },
  };
}

// 博客分类数据
const getCategories = (locale: string) => [
  {
    id: "ai-insights",
    name: locale === 'zh' ? "AI 洞察" : "AI Insights",
    emoji: "🤖",
    description: locale === 'zh' ? "关于人工智能的最新动态、趋势和深度分析" : "Latest AI trends and deep analysis",
    color: "from-blue-400 to-indigo-600",
    articleCount: 12,
  },
  {
    id: "digital-trends",
    name: locale === 'zh' ? "数字化趋势" : "Digital Trends",
    emoji: "📱",
    description: locale === 'zh' ? "数字化转型、Web 开发、移动端的最新技术" : "Digital transformation and web development",
    color: "from-green-400 to-emerald-600",
    articleCount: 8,
  },
  {
    id: "design",
    name: locale === 'zh' ? "设计前沿" : "Design",
    emoji: "🎨",
    description: locale === 'zh' ? "UI/UX 设计、品牌设计、用户体验的最佳实践" : "UI/UX and brand design best practices",
    color: "from-pink-400 to-rose-500",
    articleCount: 15,
  },
  {
    id: "marketing",
    name: locale === 'zh' ? "营销增长" : "Marketing",
    emoji: "📈",
    description: locale === 'zh' ? "SEO、社交媒体、内容营销的增长策略" : "SEO, social media, and content marketing",
    color: "from-purple-400 to-violet-600",
    articleCount: 10,
  },
];

// 博客文章数据
const getBlogPosts = (locale: string) => [
  {
    id: 1,
    slug: "ai-agent-future-work",
    title: locale === 'zh' ? "AI Agent 将如何改变未来的工作方式" : "How AI Agents Will Transform Future Work",
    excerpt: locale === 'zh' 
      ? "探索 AI 代理在各行业的应用前景，以及它们如何重塑我们的工作方式。" 
      : "Exploring the prospects of AI agents across industries and how they reshape our work.",
    category: locale === 'zh' ? "AI 洞察" : "AI Insights",
    categoryId: "ai-insights",
    date: "2024-01-15",
    readTime: locale === 'zh' ? "5 分钟" : "5 min",
    featured: true,
  },
  {
    id: 2,
    slug: "web-development-trends-2024",
    title: locale === 'zh' ? "2024 年 Web 开发趋势预测" : "Web Development Trends 2024",
    excerpt: locale === 'zh'
      ? "从 AI 辅助开发到边缘计算，今年的 Web 开发有哪些值得关注的技术趋势？"
      : "From AI-assisted development to edge computing, what tech trends are worth watching?",
    category: locale === 'zh' ? "数字化趋势" : "Digital Trends",
    categoryId: "digital-trends",
    date: "2024-01-12",
    readTime: locale === 'zh' ? "7 分钟" : "7 min",
    featured: true,
  },
  {
    id: 3,
    slug: "design-system-ux",
    title: locale === 'zh' ? "设计系统：打造一致的用户体验" : "Design Systems: Consistent UX",
    excerpt: locale === 'zh'
      ? "分享如何构建可扩展的设计系统，确保产品在各端保持一致的用户体验。"
      : "How to build scalable design systems for consistent user experience across platforms.",
    category: locale === 'zh' ? "设计前沿" : "Design",
    categoryId: "design",
    date: "2024-01-10",
    readTime: locale === 'zh' ? "6 分钟" : "6 min",
  },
];

export default async function BlogPage({ params }: { params: Params }) {
  const { locale } = await params;
  
  if (!locales.includes(locale as Locale)) {
    // notFound()
  }
  
  setRequestLocale(locale);
  
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const categories = getCategories(locale);
  const blogPosts = getBlogPosts(locale);
  const popularPosts = blogPosts.filter(post => post.featured).slice(0, 3);
  
  const texts = {
    heroTitle: locale === 'zh' ? '博客' : 'Blog',
    heroSubtitle: locale === 'zh' ? '探索 AI 与数字化的前沿，分享洞察与见解' : 'Exploring AI & Digital Frontiers',
    categories: locale === 'zh' ? '博客分类' : 'Categories',
    viewAll: locale === 'zh' ? '查看全部' : 'View All',
    allPosts: locale === 'zh' ? '全部文章' : 'All Posts',
    readMore: locale === 'zh' ? '阅读全文' : 'Read More',
    readTime: locale === 'zh' ? '阅读' : 'read',
    articles: locale === 'zh' ? '篇' : 'articles',
    subscribe: locale === 'zh' ? '订阅我们的更新' : 'Subscribe to Updates',
    subscribeDesc: locale === 'zh' ? '获取最新的 AI 洞察和数字化趋势' : 'Get the latest AI insights and digital trends',
    subscribeBtn: locale === 'zh' ? '订阅' : 'Subscribe',
    popularTags: locale === 'zh' ? '热门标签' : 'Popular Tags',
    copyright: locale === 'zh' ? '版权所有' : 'All rights reserved',
  };

  // 面包屑数据
  const breadcrumbs = [
    { name: '首页', nameEn: 'Home', path: '/' },
    { name: '博客', nameEn: 'Blog', path: '/blog' },
  ];

  return (
    <>
      {/* SEO 结构化数据 */}
      <StructuredData
        locale={locale as 'zh' | 'en'}
        schemas={['website', 'organization', 'breadcrumb']}
        breadcrumbs={breadcrumbs}
      />
      
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-white">
            7zi<span className="text-cyan-500">Studio</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              {tNav('about')}
            </Link>
            <Link href="/team" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              {tNav('team')}
            </Link>
            <Link href="/blog" className="text-cyan-500 font-medium">
              {tNav('blog')}
            </Link>
            <Link
              href="/contact"
              className="px-5 py-2 bg-cyan-500 text-white rounded-full font-medium hover:bg-cyan-600 transition-colors"
            >
              {tNav('contact')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            7zi <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">{texts.heroTitle}</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto">
            {texts.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-12 px-6 -mt-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="h-40 bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <span className="text-5xl text-white/50">📝</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 text-sm text-zinc-500 mb-3">
                    <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full">
                      {post.category}
                    </span>
                    <span>{post.readTime}{texts.readTime}</span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-cyan-500 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{texts.categories}</h2>
            <Link href="/blog" className="text-cyan-500 hover:text-cyan-600 transition-colors">
              {texts.viewAll} →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/blog/${category.id}`}
                className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center"
              >
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform`}>
                  {category.emoji}
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                  {category.name}
                </h3>
                <span className="text-xs text-zinc-500">
                  {category.articleCount} {texts.articles}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Posts */}
      <section className="py-16 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">{texts.allPosts}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="group bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-8 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
                  <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full">
                    {post.category}
                  </span>
                  <span>{post.date}</span>
                  <span>·</span>
                  <span>{post.readTime}{texts.readTime}</span>
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 group-hover:text-cyan-500 transition-colors">
                  {post.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                <Link 
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-2 text-cyan-500 font-medium group-hover:gap-3 transition-all"
                >
                  {texts.readMore}
                  <span>→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-zinc-900 text-zinc-400">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold text-white">
              7zi<span className="text-cyan-500">Studio</span>
            </div>
            <div className="flex gap-8">
              <Link href="/" className="hover:text-white transition-colors">{tNav('home')}</Link>
              <Link href="/about" className="hover:text-white transition-colors">{tNav('about')}</Link>
              <Link href="/team" className="hover:text-white transition-colors">{tNav('team')}</Link>
              <Link href="/blog" className="hover:text-white transition-colors">{tNav('blog')}</Link>
            </div>
            <div className="text-sm">
              © 2024 7zi Studio. {texts.copyright}.
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
