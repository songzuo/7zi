import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 团队管理系统 - 智能团队协作平台',
  description: 'AI 团队管理系统 - 由宋琢环球旅行团队打造的专业智能团队协作平台。实时监控 11 个专业 AI 代理工作状态、GitHub 任务进度、活动日志。提升团队效率 300%。',
  keywords: ['AI团队管理', '团队协作', '智能体管理', 'AI代理', '团队效率', '宋琢环球旅行'],
  openGraph: {
    title: 'AI 团队管理系统 - 智能团队协作平台',
    description: '实时监控 AI 团队成员状态、任务进度和活动日志',
    url: 'https://7zi.com',
    images: [
      {
        url: '/og-home.png',
        width: 1200,
        height: 630,
        alt: 'AI 团队管理系统',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 团队管理系统',
    description: '实时监控 AI 团队成员状态、任务进度和活动日志',
    images: ['/og-home.png'],
  },
  alternates: {
    canonical: 'https://7zi.com',
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12 lg:py-16">
        {/* Hero Section */}
        <section className="text-center mb-12 sm:mb-16" aria-labelledby="hero-title">
          <h1 id="hero-title" className="text-2xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            🤖 AI 团队管理系统
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-700 dark:text-gray-300 mb-6 sm:mb-8 px-2">
            实时监控 AI 团队成员状态、任务进度和活动日志
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white text-base sm:text-lg font-medium rounded-xl hover:bg-blue-700 focus:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors shadow-lg hover:shadow-xl"
            aria-label="进入实时看板"
          >
            <span aria-hidden="true">📊</span>
            <span>进入实时看板</span>
          </Link>
        </section>

        {/* Features Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8" aria-labelledby="features-title">
          <h2 id="features-title" className="sr-only">功能特点</h2>
          <FeatureCard
            icon="👥"
            title="11 位 AI 成员"
            description="实时展示所有子代理的工作状态、当前任务和完成情况"
          />
          <FeatureCard
            icon="📋"
            title="GitHub 任务集成"
            description="自动同步 GitHub Issues，实时追踪任务进度和状态"
          />
          <FeatureCard
            icon="⚡"
            title="实时活动日志"
            description="自动刷新显示最新的 Commits 和 Issues 活动记录"
          />
        </section>

        {/* Stats Section */}
        <section className="mt-8 sm:mt-12 lg:mt-16 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 transition-colors" aria-labelledby="stats-title">
          <h2 id="stats-title" className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 text-center">
            系统特性
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" role="list" aria-label="系统统计数据">
            <StatItem label="自动刷新" value="30 秒" />
            <StatItem label="GitHub API" value="实时" />
            <StatItem label="响应式设计" value="✓" />
            <StatItem label="TypeScript" value="100%" />
          </div>
        </section>

        {/* Quick Links */}
        <section className="mt-8 sm:mt-12 lg:mt-16 text-center" aria-labelledby="quicklinks-title">
          <h3 id="quicklinks-title" className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">
            快速访问
          </h3>
          <nav className="flex flex-wrap justify-center gap-2 sm:gap-4" aria-label="快速链接导航">
            <Link
              href="/dashboard"
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors"
              aria-label="实时看板"
            >
              <span aria-hidden="true">📊</span> 实时看板
            </Link>
            <Link
              href="/subagents"
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors"
              aria-label="子代理管理"
            >
              <span aria-hidden="true">🤖</span> 子代理管理
            </Link>
            <Link
              href="/tasks"
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors"
              aria-label="任务列表"
            >
              <span aria-hidden="true">📋</span> 任务列表
            </Link>
          </nav>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-md sm:shadow-lg p-5 sm:p-6 hover:shadow-xl transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <div className="text-3xl sm:text-4xl mb-3 sm:mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{description}</p>
    </article>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center" role="listitem" aria-label={`${label}: ${value}`}>
      <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-700 dark:text-blue-400 mb-0.5 sm:mb-1">{value}</div>
      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}
