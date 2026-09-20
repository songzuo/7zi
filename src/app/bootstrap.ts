/**
 * Application bootstrap module
 * Import this in the root layout to initialize server-side systems
 */

import '@/lib/server-init'

// Import Sentry (if configured)
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import('@/../../sentry.server.config')
}

export {}
