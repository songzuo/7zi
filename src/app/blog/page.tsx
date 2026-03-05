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

// 近期文章
const recentPosts = [
  {
    id: 1,
    title: "AI Agent将如何改变未来的工作方式",
    excerpt: "探索AI代理在各行业的应用前景，以及它们如何重塑我们的工作方式。",
    category: "AI洞察",
    date: "2024-01-15",
    readTime: "5分钟",
  },
  {
    id: 2,
    title: "2024年Web开发趋势预测",
    excerpt: "从AI辅助开发到边缘计算，今年的Web开发有哪些值得关注的技术趋势？",
    category: "数字化趋势",
    date: "2024-01-12",
    readTime: "7分钟",
  },
  {
    id: 3,
    title: "设计系统：打造一致的用户体验",
    excerpt: "分享如何构建可扩展的设计系统，确保产品在各端保持一致的用户体验。",
    category: "设计前沿",
    date: "2024-01-10",
    readTime: "6分钟",
  },
  {
    id: 4,
    title: "内容营销的AI革命",
    excerpt: "AI如何改变内容创作的方式，以及如何利用AI工具提升营销效果。",
    category: "营销增长",
    date: "2024-01-08",
    readTime: "4分钟",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Hero Section */}
      <section className="relative py-24 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            7zi <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">博客</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto">
            探索AI与数字化的前沿，分享洞察与见解
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">博客分类</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/blog/${category.id}`}
                className="group bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                  {category.emoji}
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  {category.name}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
                  {category.description}
                </p>
                <span className="text-sm text-zinc-500">
                  {category.articleCount} 篇文章
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-20 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">最新文章</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {recentPosts.map((post) => (
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
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  {post.excerpt}
                </p>
                <span className="inline-flex items-center gap-2 text-cyan-500 font-medium group-hover:gap-3 transition-all">
                  阅读全文
                  <span>→</span>
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
            订阅我们的更新
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            获取最新的AI洞察和数字化趋势
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="输入您的邮箱"
              className="flex-1 px-6 py-4 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-cyan-500 text-white rounded-full font-semibold hover:bg-cyan-600 transition-colors"
            >
              订阅
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
