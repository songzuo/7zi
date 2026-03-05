import Image from "next/image";
import Link from "next/link";

export default function Home() {
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
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
            AI驱动的创新数字工作室
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight">
            用AI重新定义
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500">
              团队协作
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-12">
            7zi Studio 由11位专业的AI代理组成，从战略规划到产品交付，
            为您提供一站式的数字化解决方案。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              了解更多
              <span>→</span>
            </Link>
            <Link
              href="/team"
              className="inline-flex items-center justify-center gap-2 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-8 py-4 rounded-full font-semibold text-lg hover:border-cyan-500 hover:text-cyan-500 transition-colors"
            >
              团队成员
            </Link>
          </div>
        </div>
      </section>

      {/* Team Preview */}
      <section className="py-20 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              11位AI专家，为您服务
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              我们的团队涵盖战略、技术、运营全领域，每个项目都有专业的AI成员负责
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { emoji: "🌟", name: "智能体专家" },
              { emoji: "📚", name: "咨询师" },
              { emoji: "🏗️", name: "架构师" },
              { emoji: "⚡", name: "Executor" },
              { emoji: "🛡️", name: "系统管理员" },
              { emoji: "🧪", name: "测试员" },
              { emoji: "🎨", name: "设计师" },
              { emoji: "📣", name: "推广专员" },
              { emoji: "💼", name: "销售客服" },
              { emoji: "💰", name: "财务" },
              { emoji: "📺", name: "媒体" },
            ].map((member) => (
              <div
                key={member.name}
                className="flex flex-col items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:shadow-lg transition-shadow"
              >
                <span className="text-3xl">{member.emoji}</span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{member.name}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Link
              href="/team"
              className="inline-flex items-center gap-2 text-cyan-500 font-medium hover:gap-3 transition-all"
            >
              查看完整团队
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              我们能为您做什么
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              全方位的数字化服务，满足您的各种需求
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                emoji: "💻",
                title: "网站开发",
                desc: "从设计到实现，打造高性能的现代网站和Web应用",
                color: "from-blue-400 to-cyan-500",
              },
              {
                emoji: "🎨",
                title: "品牌设计",
                desc: "专业的UI/UX设计，打造独特的品牌视觉形象",
                color: "from-pink-400 to-rose-500",
              },
              {
                emoji: "📈",
                title: "营销推广",
                desc: "SEO优化、内容营销、社交媒体运营，提升品牌影响力",
                color: "from-purple-400 to-violet-500",
              },
            ].map((service) => (
              <div
                key={service.title}
                className="group bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform`}>
                  {service.emoji}
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                  {service.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              为什么选择7zi Studio
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: "⚡",
                title: "高效执行",
                desc: "AI团队7×24小时工作，响应迅速，效率倍增",
              },
              {
                icon: "🎯",
                title: "专业专注",
                desc: "11位AI专家各司其职，确保每个环节的专业水准",
              },
              {
                icon: "💰",
                title: "成本优化",
                desc: "无需雇佣多人团队，享受高性价比的专业服务",
              },
              {
                icon: "🔄",
                title: "持续迭代",
                desc: "快速迭代优化，根据反馈不断完善产品和体验",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            准备好开始了吗？
          </h2>
          <p className="text-xl text-white/80 mb-8">
            让我们一起打造您的下一个数字项目
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-white text-cyan-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-colors"
          >
            立即咨询
            <span>→</span>
          </Link>
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
