/**
 * Server initialization - Setup global error handlers
 * Call this during application startup (e.g., in a server component or middleware)
 */

import { setupGlobalErrorHandlers } from '@/lib/global-error-handlers'

// Setup global error handlers on server startup
if (typeof window === 'undefined') {
  setupGlobalErrorHandlers()
}

export {}
