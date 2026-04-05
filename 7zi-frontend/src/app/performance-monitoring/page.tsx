/**
 * Performance Monitoring Demo Page
 * 性能监控演示页面
 */

'use client'

import React from 'react'
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard'
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary'
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring'
import { initErrorReporting } from '@/lib/error-reporting/error-reporting'
import { Button } from '@/components/ui/Button'

export default function PerformanceMonitoringPage() {
  // Initialize performance monitoring
  const monitoringState = usePerformanceMonitoring({
    enableWebVitals: true,
    enableCustomMetrics: true,
    enableBudget: true,
  })

  // Initialize error reporting
  React.useEffect(() => {
    initErrorReporting({
      enabled: true,
      sampleRate: 1.0,
    })
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4 dark:bg-gray-800">
          <div className="container mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Performance Monitoring</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                v1.12.x - Real-time monitoring and analysis
              </p>
            </div>
            <div className="flex gap-2">
              <div className="rounded-lg border px-4 py-2 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Monitoring Status
                </div>
                <div className="font-semibold text-green-600">
                  {monitoringState.isInitialized ? 'Active' : 'Initializing...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <PerformanceDashboard />

        {/* Footer */}
        <div className="mt-8 border-t bg-white px-6 py-4 dark:bg-gray-800">
          <div className="container mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
            <p>7zi Frontend - Performance Monitoring System</p>
            <p className="mt-1">
              Web Vitals • Custom Metrics • Performance Budget • Error Tracking
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
