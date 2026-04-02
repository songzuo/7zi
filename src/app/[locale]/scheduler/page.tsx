export const dynamic = 'force-dynamic'
import { setRequestLocale } from 'next-intl/server'
import { Locale, locales } from '@/i18n/config'
import SchedulerClient from './SchedulerClient'

type Params = Promise<{ locale: string }>

export default async function SchedulerPage({ params }: { params: Params }) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    // notFound()
  }

  setRequestLocale(locale)

  return <SchedulerClient locale={locale as Locale} />
}
