'use client';

/**
 * ClientProviders Component
 *
 * This component wraps the application with client-side context providers.
 * It includes the GlobalLoadingProvider for unified loading state management
 * across the entire application.
 *
 * @module components/ClientProviders
 *
 * Providers included:
 * - SettingsProvider - Application settings and preferences
 * - GlobalLoadingProvider - Global loading state management
 *
 * Global Loading System:
 * The GlobalLoadingProvider enables components to:
 * - Trigger global loading states with custom messages
 * - Track progress (0-100%)
 * - Use automatic Promise wrapping with withLoading()
 * - Create scoped loading states for isolated components
 *
 * Example usage in components:
 * ```tsx
 * import { useGlobalLoading } from '@/hooks/useGlobalLoading';
 *
 * function MyComponent() {
 *   const { startLoading, stopLoading, withLoading } = useGlobalLoading();
 *
 *   // Manual control
 *   const handleSave = async () => {
 *     startLoading('Saving data...');
 *     try {
 *       await saveData();
 *     } finally {
 *       stopLoading();
 *     }
 *   };
 *
 *   // Automatic with promise
 *   const handleFetch = async () => {
 *     const data = await withLoading(fetchData(), 'Fetching data...');
 *     return data;
 *   };
 * }
 * ```
 *
 * @see {@link GlobalLoadingProvider} - Global loading state provider
 * @see {@link useGlobalLoading} - Hook for accessing global loading state
 * @see {@link GlobalLoader} - Full-screen loading overlay component
 * @see docs/LOADING-SYSTEM.md - Complete documentation
 */

import React, { useEffect } from 'react';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { GlobalLoadingProvider } from '@/hooks/useGlobalLoading';
import { setupBrowserErrorHandlers } from '@/lib/global-error-handlers';
import { initWebVitalsMonitoring } from '@/lib/monitoring/web-vitals';

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
  }, []);

  return (
    <SettingsProvider>
      <GlobalLoadingProvider>
        {children}
      </GlobalLoadingProvider>
    </SettingsProvider>
  );
}