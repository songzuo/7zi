import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  
  return {
    title: locale === 'en' 
      ? 'AI Team Management System - Intelligent Team Collaboration Platform'
      : 'AI 团队管理系统 - 智能团队协作平台',
    description: locale === 'en'
      ? 'AI Team Management System - Professional intelligent team collaboration platform. Real-time monitoring of 11 AI agents, GitHub task progress, and activity logs. Boost team efficiency by 300%.'
      : 'AI 团队管理系统 - 由宋琢环球旅行团队打造的专业智能团队协作平台。实时监控 11 个专业 AI 代理工作状态、GitHub 任务进度、活动日志。提升团队效率 300%。',
    keywords: locale === 'en'
      ? ['AI Team Management', 'Team Collaboration', 'Agent Management', 'AI Agents', 'Team Efficiency', 'Songzhuo Global Travel']
      : ['AI团队管理', '团队协作', '智能体管理', 'AI代理', '团队效率', '宋琢环球旅行'],
    openGraph: {
      title: locale === 'en' 
        ? 'AI Team Management System - Intelligent Team Collaboration Platform'
        : 'AI 团队管理系统 - 智能团队协作平台',
      description: locale === 'en'
        ? 'Real-time monitoring of AI team members, task progress, and activity logs'
        : '实时监控 AI 团队成员状态、任务进度和活动日志',
      url: 'https://7zi.com',
      images: [{ url: '/og-home.png', width: 1200, height: 630, alt: 'AI Team Management System' }],
    },
    alternates: {
      canonical: 'https://7zi.com',
      languages: {
        'zh-CN': 'https://7zi.com',
        'en-US': 'https://7zi.com/en',
      },
    },
  };
}

export default async function Home({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      zh: {
        heroTitle: '🤖 AI 团队管理系统',
        heroSubtitle: '实时监控 AI 团队成员状态、任务进度和活动日志',
        enterDashboard: '进入实时看板',
        feature1Title: '11 位 AI 成员',
        feature1Desc: '实时展示所有子代理的工作状态、当前任务和完成情况',
        feature2Title: 'GitHub 任务集成',
        feature2Desc: '自动同步 GitHub Issues，实时追踪任务进度和状态',
        feature3Title: '实时活动日志',
        feature3Desc: '自动刷新显示最新的 Commits 和 Issues 活动记录',
        systemFeatures: '系统特性',
        autoRefresh: '自动刷新',
        seconds: '30 秒',
        githubApi: 'GitHub API',
        realtime: '实时',
        responsiveDesign: '响应式设计',
        typescript: 'TypeScript',
        quickAccess: '快速访问',
        dashboard: '实时看板',
        subagents: '子代理管理',
        tasks: '任务列表',
      },
      en: {
        heroTitle: '🤖 AI Team Management System',
        heroSubtitle: 'Real-time monitoring of AI team members, task progress, and activity logs',
        enterDashboard: 'Enter Dashboard',
        feature1Title: '11 AI Members',
        feature1Desc: 'Real-time display of all sub-agents work status, current tasks and completion',
        feature2Title: 'GitHub Task Integration',
        feature2Desc: 'Auto-sync GitHub Issues, real-time tracking of task progress and status',
        feature3Title: 'Real-time Activity Log',
        feature3Desc: 'Auto-refresh showing latest Commits and Issues activity records',
        systemFeatures: 'System Features',
        autoRefresh: 'Auto Refresh',
        seconds: '30 sec',
        githubApi: 'GitHub API',
        realtime: 'Real-time',
        responsiveDesign: 'Responsive Design',
        typescript: 'TypeScript',
        quickAccess: 'Quick Access',
        dashboard: 'Dashboard',
        subagents: 'Subagents',
        tasks: 'Tasks',
      },
    };
    return translations[locale]?.[key] || key;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12 lg:py-16">
        {/* Hero Section */}
        <section className="text-center mb-12 sm:mb-16" aria-labelledby="hero-title">
          <h1 id="hero-title" className="text-2xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            {t('heroTitle')}
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-700 dark:text-gray-300 mb-6 sm:mb-8 px-2">
            {t('heroSubtitle')}
          </p>
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white text-base sm:text-lg font-medium rounded-xl hover:bg-blue-700 focus:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors shadow-lg hover:shadow-xl"
          >
            <span aria-hidden="true">📊</span>
            <span>{t('enterDashboard')}</span>
          </Link>
        </section>

        {/* Features Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8" aria-labelledby="features-title">
          <h2 id="features-title" className="sr-only">{locale === 'en' ? 'Features' : '功能特点'}</h2>
          <FeatureCard icon="👥" title={t('feature1Title')} description={t('feature1Desc')} />
          <FeatureCard icon="📋" title={t('feature2Title')} description={t('feature2Desc')} />
          <FeatureCard icon="⚡" title={t('feature3Title')} description={t('feature3Desc')} />
        </section>

        {/* Stats Section */}
        <section className="mt-8 sm:mt-12 lg:mt-16 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 transition-colors" aria-labelledby="stats-title">
          <h2 id="stats-title" className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 text-center">
            {t('systemFeatures')}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" role="list">
            <StatItem label={t('autoRefresh')} value={t('seconds')} />
            <StatItem label={t('githubApi')} value={t('realtime')} />
            <StatItem label={t('responsiveDesign')} value="✓" />
            <StatItem label={t('typescript')} value="100%" />
          </div>
        </section>

        {/* Quick Links */}
        <section className="mt-8 sm:mt-12 lg:mt-16 text-center" aria-labelledby="quicklinks-title">
          <h3 id="quicklinks-title" className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">
            {t('quickAccess')}
          </h3>
          <nav className="flex flex-wrap justify-center gap-2 sm:gap-4" aria-label="Quick links navigation">
            <Link
              href={`/${locale}/dashboard`}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors"
            >
              <span aria-hidden="true">📊</span> {t('dashboard')}
            </Link>
            <Link
              href={`/${locale}/subagents`}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors"
            >
              <span aria-hidden="true">🤖</span> {t('subagents')}
            </Link>
            <Link
              href={`/${locale}/tasks`}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors"
            >
              <span aria-hidden="true">📋</span> {t('tasks')}
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