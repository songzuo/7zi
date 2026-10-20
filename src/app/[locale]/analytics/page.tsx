/**
 * Analytics Page
 * 数据分析页面
 */

import { setRequestLocale } from 'next-intl/server'
import { Locale, locales } from '@/i18n/config'
import { LazyAnalyticsDashboard } from '@/components/LazyComponents'

type Params = Promise<{ locale: string }>

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
