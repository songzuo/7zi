'use client'

/**
 * Google Analytics 4 Component
 * 
 * Uses @next/third-parties for proper GA4 integration with Next.js.
 * Loads the GA4 script and enables automatic page_view tracking.
 * 
 * Usage: Add to app/layout.tsx inside <body>
 * 
 * Note: This component only renders on the client side.
 * The GA_ID is read from NEXT_PUBLIC_GA_ID environment variable.
 */

import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'
import { isGA4Configured } from '@/lib/analytics/ga4'

interface GoogleAnalyticsProps {
  /** GA4 Measurement ID (e.g., G-XXXXXXXXXX) */
  gaId?: string
}

/**
 * GA4 Component - wraps @next/third-parties GoogleAnalytics
 * Only renders if NEXT_PUBLIC_GA_ID is set
 */
export function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
  const measurementId = gaId || process.env.NEXT_PUBLIC_GA_ID

  // Don't render if no GA ID configured
  if (!measurementId || !isGA4Configured()) {
    return null
  }

  return <NextGoogleAnalytics gaId={measurementId} />
}

export default GoogleAnalytics
