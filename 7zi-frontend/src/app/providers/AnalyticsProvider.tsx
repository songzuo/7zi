'use client'

/**
 * Analytics Provider - Client-side wrapper for GA4
 * 
 * This provider must be used in a client context.
 * It initializes the GA4 script and provides the analytics context.
 */

import { GoogleAnalytics } from '@next/third-parties/google'
import { isGA4Configured } from '@/lib/analytics/ga4'

interface AnalyticsProviderProps {
  children: React.ReactNode
}

/**
 * Analytics Provider Component
 * 
 * Renders the GoogleAnalytics component from @next/third-parties
 * which handles script loading and page_view tracking.
 * 
 * Place this inside a client boundary (e.g., inside a client component wrapper
 * that wraps the children in app/layout.tsx).
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <>
      {/* Google Analytics - auto-tracks page_view on route changes */}
      {isGA4Configured() && gaId && (
        <GoogleAnalytics gaId={gaId} />
      )}
      {children}
    </>
  )
}

export default AnalyticsProvider
