import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "博客 - 7zi Studio",
  description: "7zi Studio博客 - 分享AI、数字化、创新的见解和资讯",
};

// 博客分类
const categories = [
  {
    id: "ai-insights",
    name: "AI洞察",
    emoji: "🤖",
    description: "关于人工智能的最新动态、趋势和深度分析",
    color: "from-blue-400 to-indigo-600",
    articleCount: 12,
  },
  {
    id: "digital-trends",
    name: "数字化趋势",
    emoji: "📱",
    description: "数字化转型、Web开发、移动端的最新技术",
    color: "from-green-400 to-emerald-600",
    articleCount: 8,
  },
  {
    id: "design",
    name: "设计前沿",
    emoji: "🎨",
    description: "UI/UX设计、品牌设计、用户体验的最佳实践",
    color: "from-pink-400 to-rose-500",
    articleCount: 15,
  },
  {
    id: "marketing",
    name: "营销增长",
    emoji: "📈",
    description: "SEO、社交媒体、内容营销的增长策略",
    color: "from-purple-400 to-violet-600",
    articleCount: 10,
  },
  {
    id: "case-studies",
    name: "案例研究",
    emoji: "💡",
    description: "项目案例分析、成功经验和教训分享",
    color: "from-amber-400 to-orange-500",
    articleCount: 6,
  },
  {
    id: "team-updates",
    name: "团队动态",
    emoji: "📰",
    description: "7zi Studio团队的最新消息和更新",
    color: "from-cyan-400 to-sky-500",
    articleCount: 4,
  },
];

// 博客文章数据
const blogPosts = [
  {
    id: 1,
    slug: "ai-agent-future-work",
    title: "AI Agent将如何改变未来的工作方式",
    excerpt: "探索AI代理在各行业的应用前景，以及它们如何重塑我们的工作方式。从自动化客服到智能决策支持，AI正在彻底改变企业的运营模式。",
    category: "AI洞察",
    categoryId: "ai-insights",
    date: "2024-01-15",
    readTime: "5分钟",
    featured: true,
  },
  {
    id: 2,
    slug: "web-development-trends-2024",
    title: "2024年Web开发趋势预测",
    excerpt: "从AI辅助开发到边缘计算，今年的Web开发有哪些值得关注的技术趋势？探索React Server Components、WebAssembly等新技术的应用。",
    category: "数字化趋势",
    categoryId: "digital-trends",
    date: "2024-01-12",
    readTime: "7分钟",
    featured: true,
  },
  {
    id: 3,
    slug: "design-system-ux",
    title: "设计系统：打造一致的用户体验",
    excerpt: "分享如何构建可扩展的设计系统，确保产品在各端保持一致的用户体验。包含组件库设计、Token管理、文档编写等最佳实践。",
    category: "设计前沿",
    categoryId: "design",
    date: "2024-01-10",
    readTime: "6分钟",
  },
  {
    id: 4,
    slug: "ai-content-marketing",
    title: "内容营销的AI革命",
    excerpt: "AI如何改变内容创作的方式，以及如何利用AI工具提升营销效果。从SEO文章到社交媒体内容，AI正在成为营销团队的得力助手。",
    category: "营销增长",
    categoryId: "marketing",
    date: "2024-01-08",
    readTime: "4分钟",
  },
  {
    id: 5,
    slug: "llm-prompt-engineering",
    title: "LLM提示工程：解锁AI的真正潜力",
    excerpt: "深入探讨如何编写有效的提示词，让AI模型产生更高质量的输出。包含思维链、few-shot learning等高级技巧。",
    category: "AI洞察",
    categoryId: "ai-insights",
    date: "2024-01-05",
    readTime: "8分钟",
  },
  {
    id: 6,
    slug: "seo-strategies-2024",
    title: "2024年SEO优化完全指南",
    excerpt: "AI搜索时代下的SEO策略发生了哪些变化？如何优化内容以获得更好的排名？最新算法解读和实操技巧。",
    category: "营销增长",
    categoryId: "marketing",
    date: "2024-01-03",
    readTime: "6分钟",
  },
  {
    id: 7,
    slug: "nextjs-14-features",
    title: "Next.js 14新特性深度解析",
    excerpt: "全面解读Next.js 14的服务器动作、路由增强和性能优化。帮助您快速上手最新版本，提升开发效率。",
    category: "数字化趋势",
    categoryId: "digital-trends",
    date: "2023-12-28",
    readTime: "10分钟",
  },
  {
    id: 8,
    slug: "brand-identity-design",
    title: "品牌视觉Identity设计流程",
    excerpt: "从品牌调研到视觉系统建立，完整分享品牌设计项目的全流程。包含Logo设计、色彩规范、字体选择等关键环节。",
    category: "设计前沿",
    categoryId: "design",
    date: "2023-12-25",
    readTime: "7分钟",
  },
];

// 热门文章
const popularPosts = blogPosts.filter(post => post.featured).slice(0, 3);

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-zinc-900 dark:text-white">
            7zi<span className="text-cyan-500">Studio</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              关于我们
            </Link>
            <Link href="/team" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              团队成员
            </Link>
            <Link href="/blog" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
              博客
            </Link>
            <Link
              href="/contact"
              className="px-5 py-2 bg-cyan-500 text-white rounded-full font-medium hover:bg-cyan-600 transition-colors"
            >
              联系我们
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            7zi <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">博客</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto">
            探索AI与数字化的前沿，分享洞察与见解
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
                className="group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="h-40 bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <span className="text-5xl text-white/50">📝</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 text-sm text-zinc-500 mb-3">
                    <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full">
                      {post.category}
                    </span>
                    <span>{post.readTime}阅读</span>
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
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">博客分类</h2>
            <Link href="/blog" className="text-cyan-500 hover:text-cyan-600 transition-colors">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                  {category.articleCount} 篇
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Posts */}
      <section className="py-16 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">全部文章</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="group bg-zinc-50 dark:bg-zinc-800 rounded-3xl p-8 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
                  <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full">
                    {post.category}
                  </span>
                  <span>{post.date}</span>
                  <span>·</span>
                  <span>{post.readTime}阅读</span>
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
                  阅读全文
                  <span>→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-cyan-500 to-purple-600 rounded-3xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              订阅我们的更新
            </h2>
            <p className="text-white/80 mb-8">
              获取最新的AI洞察和数字化趋势，每周精选内容直接送达您的邮箱
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="输入您的邮箱"
                className="flex-1 px-6 py-4 rounded-full bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-zinc-900 text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors"
              >
                订阅
              </button>
            </form>
            <p className="text-white/60 text-sm mt-4">
              每周六发送， unsubscribe随时退订
            </p>
          </div>
        </div>
      </section>

      {/* Tags Cloud */}
      <section className="py-16 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">热门标签</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "AI", "ChatGPT", "LLM", "Next.js", "React", 
              "TypeScript", "UI设计", "UX", "SEO", "营销",
              "数字化转型", "Web开发", "前端", "后端", "云服务"
            ].map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${tag}`}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-sm hover:bg-cyan-500 hover:text-white transition-colors"
              >
                {tag}
              </Link>
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
              <Link href="/" className="hover:text-white transition-colors">首页</Link>
              <Link href="/about" className="hover:text-white transition-colors">关于我们</Link>
              <Link href="/team" className="hover:text-white transition-colors">团队成员</Link>
              <Link href="/blog" className="hover:text-white transition-colors">博客</Link>
            </div>
            <div className="text-sm">
              © 2024 7zi Studio. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
