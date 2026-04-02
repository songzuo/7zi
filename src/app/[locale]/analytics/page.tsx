/**
 * Analytics Page
 * 数据分析页面
 */

import { setRequestLocale } from 'next-intl/server'
import { Locale, locales } from '@/i18n/config'
import { LazyAnalyticsDashboard } from '@/components/LazyComponents'
import { Metadata } from 'next'

type Params = Promise<{ locale: string }>

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  const title = locale === 'zh' ? '数据分析 - 7zi Studio' : 'Analytics - 7zi Studio'
  const description =
    locale === 'zh'
      ? '查看团队活动、任务进度、收入趋势等关键指标'
      : 'View team activity, task progress, revenue trends, and more key metrics'

  return {
    title,
    description,
  }
}

// ============================================================================
// Page Component
// ============================================================================

export default async function AnalyticsPage({ params }: { params: Params }) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    // notFound()
  }

  setRequestLocale(locale)

  return <LazyAnalyticsDashboard locale={locale} />
}

// ============================================================================
// Config
// ============================================================================

export const dynamic = 'force-dynamic'
