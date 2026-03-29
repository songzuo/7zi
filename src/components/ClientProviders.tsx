'use client';

/**
 * ClientProviders Component
 *
 * This component now initializes client-side features only.
 * Zustand stores don't require providers, so this component is simplified.
 *
 * @module components/ClientProviders
 *
 * Note: GlobalLoadingProvider has been removed. Use uiStore for global loading state:
 * ```tsx
 * import { useUIStore } from '@/stores/uiStore';
 * import { setGlobalLoading } from '@/stores/uiStore';
 *
 * // In components
 * const { globalLoading, loadingMessage } = useUIStore();
 * const { setGlobalLoading } = useUIStore.getState();
 * ```
 */

import React, { useEffect } from 'react';
import { setupBrowserErrorHandlers } from '@/lib/global-error-handlers';
import { initWebVitalsMonitoring } from '@/lib/monitoring/web-vitals';
import initPerformanceMonitoring from '@/lib/monitoring/performance-metrics';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  // Initialize browser error handlers and Web Vitals on mount
  useEffect(() => {
    setupBrowserErrorHandlers();

    // Initialize Web Vitals monitoring
    initWebVitalsMonitoring({
      enableSentry: true,
      enableConsole: process.env.NODE_ENV === 'development',
      sampleRate: 1.0, // 100% sampling in production
      debug: process.env.NODE_ENV === 'development',
    });

    // Initialize enhanced performance monitoring
    initPerformanceMonitoring();
  }, []);

  // No providers needed - Zustand stores work without them
  return <>{children}</>;
}