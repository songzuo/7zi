import Link from "next/link";

const baseUrl = "https://7zi.studio";

// 博客文章数据
const blogPosts = [
  {
    id: "ai-agent-future-work",
    title: "AI Agent 将如何改变未来的工作方式",
    excerpt: "探索 AI 代理在各行业的应用前景，以及它们如何重塑我们的工作方式。",
    content: `
      <h2>引言</h2>
      <p>人工智能正在以惊人的速度发展，其中 AI Agent（AI 代理）已经成为最引人注目的技术趋势之一。与传统的 AI 工具不同，AI Agent 具备自主规划、执行和学习的能力，正在重新定义人类与机器的协作方式。</p>
      
      <h2>什么是 AI Agent？</h2>
      <p>AI Agent 是一种能够感知环境、制定计划并执行任务的人工智能系统。与简单的问答机器人不同，AI Agent 可以：</p>
      <ul>
        <li>自主分析复杂问题</li>
        <li>分解大型任务为可执行的子任务</li>
        <li>根据反馈持续学习和优化</li>
        <li>与其他 Agent 或系统协作</li>
      </ul>
      
      <h2>AI Agent 在各行业的应用</h2>
      <p>从软件开发到内容创作，从医疗诊断到金融服务，AI Agent 正在改变各个行业的工作方式。</p>
      
      <h3>软件开发</h3>
      <p>AI Agent 可以自动编写代码、调试程序、甚至进行代码审查，极大提高了开发效率。</p>
      
      <h3>内容创作</h3>
      <p>从撰写文章到制作视频，AI Agent 正在成为创作者的强大助手。</p>
      
      <h2>未来展望</h2>
      <p>随着技术的不断进步，我们可以预见 AI Agent 将在更多领域发挥重要作用。7zi Studio 正是基于这一理念，组建了由 11 位 AI Agent 组成的专业团队，为客户提供全方位的数字化服务。</p>
      
      <h2>结语</h2>
      <p>AI Agent 不是要取代人类，而是要与人类协作，共同创造更大的价值。拥抱这一技术变革，将帮助我们在未来保持竞争力。</p>
    `,
    category: "AI 洞察",
    categoryColor: "from-blue-400 to-indigo-600",
    date: "2024-01-15",
    readTime: "5 分钟",
    author: "智能体世界专家",
    authorEmoji: "🌟",
    tags: ["AI", "Agent", "未来工作", "数字化转型"],
  },
  {
    id: "web-development-trends-2024",
    title: "2024 年 Web 开发趋势预测",
    excerpt: "从 AI 辅助开发到边缘计算，今年的 Web 开发有哪些值得关注的技术趋势？",
    content: `
      <h2>引言</h2>
      <p>Web 开发领域正在经历快速变革。2024 年，哪些技术趋势值得关注？让我们一起来探索。</p>
      
      <h2>AI 辅助开发</h2>
      <p>AI 代码助手正在成为开发者的标准工具。从代码补全到自动重构，AI 大大提高了开发效率。</p>
      
      <h2>边缘计算</h2>
      <p>边缘计算将计算资源推向网络边缘，提供更低的延迟和更好的用户体验。</p>
      
      <h2>WebAssembly 成熟</h2>
      <p>WASM 正在开启 Web 应用的新可能，让 Web 应用能够实现接近原生的性能。</p>
      
      <h2>结论</h2>
      <p>2024 年将是 Web 开发激动人心的一年。新技术的涌现为开发者提供了更多可能性，也带来了新的挑战。</p>
    `,
    category: "数字化趋势",
    categoryColor: "from-green-400 to-emerald-600",
    date: "2024-01-12",
    readTime: "7 分钟",
    author: "架构师",
    authorEmoji: "🏗️",
    tags: ["Web 开发", "趋势", "AI", "边缘计算"],
  },
  {
    id: "design-system-ux",
    title: "设计系统：打造一致的用户体验",
    excerpt: "分享如何构建可扩展的设计系统，确保产品在各端保持一致的用户体验。",
    content: `
      <h2>什么是设计系统？</h2>
      <p>设计系统是一套完整的设计标准、组件库和文档，帮助团队创建一致的用户体验。</p>
      
      <h2>构建设计系统的关键要素</h2>
      <ul>
        <li><strong>设计原则</strong>：指导设计决策的核心原则</li>
        <li><strong>组件库</strong>：可复用的 UI 组件</li>
        <li><strong>设计令牌</strong>：颜色、间距等设计变量的统一管理</li>
        <li><strong>文档</strong>：组件使用说明和最佳实践</li>
      </ul>
      
      <h2>为什么需要设计系统？</h2>
      <p>设计系统可以提高团队效率，确保产品一致性，加速新功能的开发。</p>
      
      <h2>最佳实践</h2>
      <p>从小处着手，持续迭代。设计系统不是一次性项目，而是需要不断完善的生命体。</p>
    `,
    category: "设计前沿",
    categoryColor: "from-pink-400 to-rose-500",
    date: "2024-01-10",
    readTime: "6 分钟",
    author: "设计师",
    authorEmoji: "🎨",
    tags: ["设计系统", "UI/UX", "组件库"],
  },
  {
    id: "ai-content-marketing",
    title: "内容营销的 AI 革命",
    excerpt: "AI 如何改变内容创作的方式，以及如何利用 AI 工具提升营销效果。",
    content: `
      <h2>AI 与内容创作</h2>
      <p>人工智能正在彻底改变内容创作的方式。从选题到撰写，AI 工具正在成为营销人员的得力助手。</p>
      
      <h2>AI 内容工具的应用场景</h2>
      <ul>
        <li>内容构思和选题</li>
        <li>文章初稿撰写</li>
        <li>SEO 优化建议</li>
        <li>社交媒体内容生成</li>
      </ul>
      
      <h2>如何有效利用 AI</h2>
      <p>AI 是工具，不是替代品。最好的内容仍然需要人类的创意和情感洞察。</p>
      
      <h2>结论</h2>
      <p>拥抱 AI，但保持人性化。找到 AI 效率与人类创意的平衡点。</p>
    `,
    category: "营销增长",
    categoryColor: "from-purple-400 to-violet-600",
    date: "2024-01-08",
    readTime: "4 分钟",
    author: "推广专员",
    authorEmoji: "📣",
    tags: ["AI", "内容营销", "数字营销"],
  },
];

// 生成静态参数
export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.id,
  }));
}

// 获取文章
export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.id === params.slug) || blogPosts[0];

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

      {/* Article Header */}
      <section className="pt-32 pb-12 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
        <article className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
          >
            <span>←</span> 返回博客
          </Link>
          
          <div className="flex items-center gap-4 text-sm text-zinc-400 mb-6">
            <span className={`px-4 py-1.5 bg-gradient-to-r ${post.categoryColor} text-white rounded-full font-medium`}>
              {post.category}
            </span>
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readTime}阅读</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {post.title}
          </h1>
          
          <p className="text-xl text-zinc-300 mb-8">
            {post.excerpt}
          </p>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-2xl">
              {post.authorEmoji}
            </div>
            <div>
              <div className="font-medium text-white">{post.author}</div>
              <div className="text-sm text-zinc-400">7zi Studio 团队</div>
            </div>
          </div>
        </article>
      </section>

      {/* Article Content */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <article className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
            <div 
              className="prose prose-lg dark:prose-invert max-w-none
                prose-headings:font-bold prose-headings:text-zinc-900 dark:prose-headings:text-white
                prose-p:text-zinc-600 dark:prose-p:text-zinc-300
                prose-ul:text-zinc-600 dark:prose-ul:text-zinc-300
                prose-strong:text-zinc-900 dark:prose-strong:text-white
                prose-a:text-cyan-500 hover:prose-a:text-cyan-600
                prose-code:text-cyan-600 dark:prose-code:text-cyan-400 prose-code:bg-cyan-50 dark:prose-code:bg-cyan-900/20 prose-code:px-2 prose-code:py-0.5 prose-code:rounded
                prose-blockquote:border-l-4 prose-blockquote:border-cyan-500 prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-800 prose-blockquote:p-4 prose-blockquote:rounded-r-lg"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* Tags */}
            <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Share */}
            <div className="mt-8 flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">分享这篇文章</span>
              <div className="flex gap-4">
                <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-cyan-500 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </button>
                <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-green-500 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </button>
                <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-600 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Related Articles */}
      <section className="py-16 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">相关文章</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blogPosts.slice(1, 3).map((relatedPost) => (
              <Link
                key={relatedPost.id}
                href={`/blog/${relatedPost.id}`}
                className="group bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
                  <span className={`px-2 py-0.5 bg-gradient-to-r ${relatedPost.categoryColor} text-white rounded-full`}>
                    {relatedPost.category}
                  </span>
                  <span>{relatedPost.readTime}阅读</span>
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-cyan-500 transition-colors">
                  {relatedPost.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {relatedPost.excerpt.substring(0, 80)}...
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
            订阅我们的更新
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            获取更多 AI 洞察和数字化趋势
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

      {/* Structured Data for Blog Post */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            url: `${baseUrl}/blog/${post.id}`,
            datePublished: post.date,
            dateModified: post.date,
            author: {
              "@type": "Person",
              name: post.author,
            },
            publisher: {
              "@type": "Organization",
              name: "7zi Studio",
              url: baseUrl,
              logo: {
                "@type": "ImageObject",
                url: `${baseUrl}/logo.png`,
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${baseUrl}/blog/${post.id}`,
            },
            articleBody: post.excerpt,
            wordCount: post.readTime,
            keywords: post.tags.join(", "),
            articleSection: post.category,
          }),
        }}
      />
    </div>
  );
}
