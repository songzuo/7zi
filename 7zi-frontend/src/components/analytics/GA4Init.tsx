'use client'

/**
 * GA4Init - Client-side GA4 initialization for app/layout.tsx
 * 
 * This is a client component that initializes Google Analytics 4.
 * It should be placed in the body of the root layout.
 * 
 * @next/third-parties GoogleAnalytics component:
 * - Loads gtag.js with the configured GA ID
 * - Automatically tracks page_view on route changes
 * - Works with Next.js App Router
 */

import { GoogleAnalytics } from '@next/third-parties/google'

export function GA4Init() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  if (!gaId) {
    return null
  }

  return <GoogleAnalytics gaId={gaId} />
}

export default GA4Init
