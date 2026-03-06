import type { Metadata } from "next";
import Link from "next/link";

const baseUrl = "https://7zi.studio";

export const metadata: Metadata = {
  title: "联系我们 - 获取专业数字化服务",
  description: "联系 7zi Studio - AI 驱动的创新数字工作室。商务合作、技术支持、项目咨询，我们 24 小时内回复。",
  keywords: ["联系 7zi Studio", "商务合作", "项目咨询", "技术支持", "数字化服务"],
  openGraph: {
    title: "联系我们 - 7zi Studio",
    description: "有任何问题或合作意向？我们随时准备为您服务",
    url: `${baseUrl}/contact`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "联系我们 - 7zi Studio",
    description: "商务合作、技术支持、项目咨询",
  },
  alternates: {
    canonical: `${baseUrl}/contact`,
  },
};

// 社交媒体链接
const socialLinks = [
  {
    name: "微信公众号",
    icon: "💬",
    description: "关注我们获取最新资讯",
    link: "#",
    color: "from-green-500 to-emerald-600",
  },
  {
    name: "GitHub",
    icon: "🐙",
    description: "查看我们的开源项目",
    link: "https://github.com/7zi-studio",
    color: "from-zinc-700 to-zinc-900",
  },
  {
    name: "Twitter",
    icon: "🐦",
    description: "关注我们的最新动态",
    link: "https://twitter.com/7zistudio",
    color: "from-sky-400 to-sky-600",
  },
  {
    name: "LinkedIn",
    icon: "💼",
    description: "专业网络连接",
    link: "https://linkedin.com/company/7zistudio",
    color: "from-blue-600 to-blue-800",
  },
];

// 联系方式信息
const contactInfo = [
  {
    emoji: "📧",
    title: "商务合作",
    email: "business@7zi.studio",
    description: "项目咨询、商务合作",
  },
  {
    emoji: "💻",
    title: "技术支持",
    email: "support@7zi.studio",
    description: "技术问题、售后服务",
  },
  {
    emoji: "🤝",
    title: "加入我们",
    email: "careers@7zi.studio",
    description: "AI 合作伙伴招募",
  },
];

export default function ContactPage() {
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
      <section className="relative py-24 px-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            联系 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">7zi Studio</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto">
            有任何问题或合作意向？我们随时准备为您服务
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                发送消息
              </h2>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      姓名
                    </label>
                    <input
                      type="text"
                      placeholder="您的姓名"
                      className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      邮箱
                    </label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    公司（可选）
                  </label>
                  <input
                    type="text"
                    placeholder="您的公司"
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    主题
                  </label>
                  <select className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors">
                    <option value="">选择咨询主题</option>
                    <option value="project">项目咨询</option>
                    <option value="cooperation">商务合作</option>
                    <option value="support">技术支持</option>
                    <option value="careers">加入我们</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    消息内容
                  </label>
                  <textarea
                    rows={6}
                    placeholder="请描述您的需求..."
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-semibold text-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                >
                  发送消息
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              {/* Email Cards */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                  邮箱联系
                </h2>
                <div className="space-y-6">
                  {contactInfo.map((info) => (
                    <div key={info.title} className="flex items-start gap-4">
                      <div className="text-3xl">{info.emoji}</div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">
                          {info.title}
                        </h3>
                        <a
                          href={`mailto:${info.email}`}
                          className="text-cyan-500 hover:text-cyan-600 transition-colors"
                        >
                          {info.email}
                        </a>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
                  关注我们
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center gap-4 p-4 bg-gradient-to-br ${social.color} rounded-2xl hover:scale-105 transition-all duration-300`}
                    >
                      <span className="text-2xl">{social.icon}</span>
                      <div>
                        <h3 className="font-bold text-white">{social.name}</h3>
                        <p className="text-xs text-white/70">{social.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-gradient-to-r from-cyan-500 to-purple-600 rounded-3xl p-8 text-white">
                <h3 className="text-xl font-bold mb-2">响应时间</h3>
                <p className="text-white/80">
                  我们通常在 <strong>24 小时内</strong> 回复您的消息。
                  工作日期间响应更快！
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-12">
            常见问题
          </h2>
          <div className="space-y-6">
            {[
              {
                question: "7zi Studio 能提供哪些服务？",
                answer: "我们提供网站开发、品牌设计、UI/UX 设计、SEO 优化、内容营销等全方位数字化服务。",
              },
              {
                question: "如何开始合作？",
                answer: "您可以通过填写联系表单或发送邮件与我们取得联系，我们的团队会在 24 小时内回复您。",
              },
              {
                question: "你们的定价模式是怎样的？",
                answer: "我们根据项目需求提供定制化报价，包括项目定价和月度服务两种模式。",
              },
              {
                question: "是否提供免费咨询？",
                answer: "是的，我们提供首次免费咨询，您可以详细描述您的需求，我们会给出初步建议。",
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="group bg-zinc-50 dark:bg-zinc-800 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {faq.question}
                  </span>
                  <span className="ml-4 flex-shrink-0 text-cyan-500 group-open:rotate-180 transition-transform">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-zinc-600 dark:text-zinc-400">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-600 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            还在犹豫？
          </h2>
          <p className="text-xl text-white/80 mb-8">
            立即开始您的数字项目，与 7zi Studio 一起创造未来
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:business@7zi.studio"
              className="inline-flex items-center justify-center gap-2 bg-white text-cyan-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-colors"
            >
              发送邮件
              <span>✉️</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors"
            >
              返回首页
            </Link>
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

      {/* Structured Data for Contact Page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "联系 7zi Studio",
            description: "商务合作、技术支持、项目咨询",
            url: `${baseUrl}/contact`,
            mainEntity: {
              "@type": "Organization",
              name: "7zi Studio",
              url: baseUrl,
              contactPoint: contactInfo.map((info) => ({
                "@type": "ContactPoint",
                contactType: info.title,
                email: info.email,
                description: info.description,
              })),
              sameAs: socialLinks.map((s) => s.link).filter((l) => l !== "#"),
            },
          }),
        }}
      />
    </div>
  );
}
