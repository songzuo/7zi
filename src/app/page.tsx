import type { Metadata } from "next";
import Link from "next/link";
import { ClientProviders, ThemeToggle, AIChat } from "@/components/ClientProviders";
import { GitHubActivity } from "@/components/GitHubActivity";
import { ProjectDashboard } from "@/components/ProjectDashboard";
import { MobileMenu } from "@/components/MobileMenu";

const baseUrl = "https://7zi.studio";

export const metadata: Metadata = {
  title: "首页 - AI 驱动的创新数字工作室",
  description: "7zi Studio 由 11 位专业 AI 代理组成，提供网站开发、品牌设计、营销推广等全方位数字化服务。高效、专业、创新，助您打造卓越数字产品。",
  keywords: ["AI 工作室", "网站开发", "品牌设计", "SEO 优化", "数字营销", "UI/UX 设计", "AI 代理团队"],
  openGraph: {
    title: "7zi Studio - AI 驱动的创新数字工作室",
    description: "由 11 位 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务",
    url: baseUrl,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "7zi Studio - AI 驱动的创新数字工作室",
    description: "由 11 位 AI 代理组成的创新数字工作室",
  },
  alternates: {
    canonical: baseUrl,
  },
};

export default function Home() {
  return (
    <ClientProviders>
      <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white touch-feedback">
              7zi<span className="text-cyan-500">Studio</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-6">
                <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  关于我们
                </Link>
                <Link href="/team" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  团队成员
                </Link>
                <Link href="/blog" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  博客
                </Link>
                <a
                  href="https://visa.7zi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors"
                >
                  7zi 环球通
                </a>
                <Link href="/dashboard" className="text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors">
                  Dashboard
                </Link>
                <ThemeToggle />
                <Link
                  href="/contact"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all touch-feedback"
                >
                  联系我们
                </Link>
              </div>
              
              {/* Mobile Navigation */}
              <div className="flex lg:hidden items-center gap-2">
                <ThemeToggle />
                <MobileMenu />
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section with Enhanced 3D Effects */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 pt-20">
          {/* Animated Background Grid with Parallax */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] parallax-layer" />
          
          {/* Floating Orbs with Enhanced Animations */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-500" />
          
          {/* Animated Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-500/30 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
            {/* Enhanced Badge with Glow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 glow-on-hover touch-feedback cursor-default">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              <span className="hidden sm:inline">AI 驱动的创新数字工作室</span>
              <span className="sm:hidden">AI 驱动工作室</span>
            </div>
            
            {/* Enhanced Heading with Text Reveal */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000">
              用 AI 重新定义
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%] inline-block hover:scale-105 transition-transform duration-300">
                团队协作
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-8 md:mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              7zi Studio 由 11 位专业的 AI 代理组成，从战略规划到产品交付，
              为您提供一站式的数字化解决方案。
            </p>
            
            {/* Enhanced CTA Buttons with Ripple Effect */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
              <Link
                href="/about"
                className="group relative inline-flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg overflow-hidden ripple-container touch-feedback hover:shadow-xl hover:shadow-cyan-500/25 hover:-translate-y-1 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  了解更多
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link
                href="/team"
                className="group inline-flex items-center justify-center gap-2 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg hover:border-cyan-500 hover:text-cyan-500 dark:hover:border-cyan-400 dark:hover:text-cyan-400 transition-all hover:-translate-y-1 touch-feedback"
              >
                团队成员
                <span className="group-hover:rotate-45 transition-transform">↗</span>
              </Link>
            </div>

            {/* Enhanced Stats with Hover Effects */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-16 sm:mt-20 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-600">
              <div className="text-center p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300 hover-lift touch-feedback cursor-default">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500 animate-bounce-in">11+</div>
                <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">AI 专家</div>
              </div>
              <div className="text-center p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300 hover-lift touch-feedback cursor-default">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 animate-bounce-in stagger-1">24/7</div>
                <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">在线服务</div>
              </div>
              <div className="text-center p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-300 hover-lift touch-feedback cursor-default">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 animate-bounce-in stagger-2">100%</div>
                <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">项目交付</div>
              </div>
            </div>
          </div>

          {/* Enhanced Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce touch-feedback cursor-pointer">
            <div className="w-6 h-10 border-2 border-zinc-400 dark:border-zinc-600 rounded-full flex items-start justify-center p-2 hover:border-cyan-500 transition-colors">
              <div className="w-1.5 h-3 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* Team Preview with Enhanced Animations */}
        <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 observe-fade">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4 text-reveal">
                11 位 AI 专家，为您服务
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                我们的团队涵盖战略、技术、运营全领域，每个项目都有专业的 AI 成员负责
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {[
                { emoji: "🌟", name: "智能体专家", color: "from-yellow-400 to-orange-500" },
                { emoji: "📚", name: "咨询师", color: "from-blue-400 to-cyan-500" },
                { emoji: "🏗️", name: "架构师", color: "from-purple-400 to-pink-500" },
                { emoji: "⚡", name: "Executor", color: "from-green-400 to-emerald-500" },
                { emoji: "🛡️", name: "系统管理员", color: "from-red-400 to-rose-500" },
                { emoji: "🧪", name: "测试员", color: "from-indigo-400 to-violet-500" },
                { emoji: "🎨", name: "设计师", color: "from-pink-400 to-rose-500" },
                { emoji: "📣", name: "推广专员", color: "from-orange-400 to-amber-500" },
                { emoji: "💼", name: "销售客服", color: "from-teal-400 to-cyan-500" },
                { emoji: "💰", name: "财务", color: "from-emerald-400 to-green-500" },
                { emoji: "📺", name: "媒体", color: "from-blue-400 to-indigo-500" },
              ].map((member, index) => (
                <div
                  key={member.name}
                  className="group flex flex-col items-center gap-3 p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:shadow-xl hover:-translate-y-2 transition-all duration-300 observe-fade touch-feedback cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                    <span className="group-hover:animate-bounce block">{member.emoji}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 text-center">{member.name}</span>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-8 observe-fade">
              <Link
                href="/team"
                className="inline-flex items-center gap-2 text-cyan-500 font-medium hover:gap-3 transition-all touch-feedback group"
              >
                查看完整团队
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* GitHub Activity */}
        <GitHubActivity />

        {/* Project Dashboard */}
        <ProjectDashboard />

        {/* Services with Enhanced Cards */}
        <section className="py-16 sm:py-20 px-6 bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent dark:via-zinc-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 observe-fade">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4 text-reveal">
                我们能为您做什么
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                全方位的数字化服务，满足您的各种需求
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  emoji: "💻",
                  title: "网站开发",
                  desc: "从设计到实现，打造高性能的现代网站和 Web 应用",
                  color: "from-blue-400 to-cyan-500",
                  features: ["响应式设计", "性能优化", "SEO 友好"],
                },
                {
                  emoji: "🎨",
                  title: "品牌设计",
                  desc: "专业的 UI/UX 设计，打造独特的品牌视觉形象",
                  color: "from-pink-400 to-rose-500",
                  features: ["Logo 设计", "视觉识别", "用户体验"],
                },
                {
                  emoji: "📈",
                  title: "营销推广",
                  desc: "SEO 优化、内容营销、社交媒体运营，提升品牌影响力",
                  color: "from-purple-400 to-violet-500",
                  features: ["SEO 优化", "内容策略", "社交媒体"],
                },
              ].map((service, index) => (
                <div
                  key={service.title}
                  className="group relative bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 observe-fade overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Gradient Border Effect */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl`} />
                  
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl sm:text-3xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg touch-feedback cursor-pointer`}>
                    {service.emoji}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                    {service.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                    {service.desc}
                  </p>
                  <ul className="space-y-2">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us with Enhanced Cards */}
        <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 observe-fade">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4 text-reveal">
                为什么选择 7zi Studio
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {[
                {
                  icon: "⚡",
                  title: "高效执行",
                  desc: "AI 团队 7×24 小时工作，响应迅速，效率倍增",
                  gradient: "from-yellow-400 to-orange-500",
                },
                {
                  icon: "🎯",
                  title: "专业专注",
                  desc: "11 位 AI 专家各司其职，确保每个环节的专业水准",
                  gradient: "from-blue-400 to-cyan-500",
                },
                {
                  icon: "💰",
                  title: "成本优化",
                  desc: "无需雇佣多人团队，享受高性价比的专业服务",
                  gradient: "from-green-400 to-emerald-500",
                },
                {
                  icon: "🔄",
                  title: "持续迭代",
                  desc: "快速迭代优化，根据反馈不断完善产品和体验",
                  gradient: "from-purple-400 to-pink-500",
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="group flex items-start gap-4 p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 observe-fade touch-feedback cursor-pointer"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-md`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enhanced CTA Section */}
        <section className="py-16 sm:py-20 px-6 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%] relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
          
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 animate-in fade-in zoom-fade duration-700">
              准备好开始了吗？
            </h2>
            <p className="text-lg sm:text-xl text-white/80 mb-8 animate-in fade-in slide-up duration-700 delay-200">
              让我们一起打造您的下一个数字项目
            </p>
            <Link
              href="/contact"
              className="group inline-flex items-center justify-center gap-2 bg-white text-cyan-600 px-6 sm:px-8 py-4 rounded-full font-semibold text-lg hover:bg-cyan-50 transition-all hover:shadow-xl hover:-translate-y-1 touch-feedback ripple-container"
            >
              立即咨询
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </section>

        {/* AI Chat Component */}
        <AIChat />

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

        {/* Structured Data for Homepage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "7zi Studio - 首页",
              description: "AI 驱动的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务",
              url: baseUrl,
              publisher: {
                "@type": "Organization",
                name: "7zi Studio",
                url: baseUrl,
              },
            }),
          }}
        />
      </div>
    </ClientProviders>
  );
}
