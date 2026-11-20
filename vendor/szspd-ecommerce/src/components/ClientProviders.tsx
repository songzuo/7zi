'use client'

/**
 * ClientProviders Component
 * Simplified - only handles browser error handlers.
 * Analytics/monitoring handled by Analytics.tsx (lazy loaded).
 */

import React, { useEffect } from 'react'
import { setupBrowserErrorHandlers } from '@/lib/global-error-handlers'

interface ClientProvidersProps {
  children: React.ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  useEffect(() => {
    setupBrowserErrorHandlers()
  }, [])

  return <>{children}</>
}
