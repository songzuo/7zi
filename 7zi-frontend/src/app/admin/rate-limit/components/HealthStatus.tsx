/**
 * Health Status Component
 * 
 * Displays the health status of the rate limiting service
 * 
 * @version 1.12.0
 */

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { RateLimitHealth } from '../hooks/useRateLimitApi'

interface HealthStatusProps {
  health?: RateLimitHealth
  loading?: boolean
}

export function HealthStatus({ health, loading = false }: HealthStatusProps) {
  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-sm text-gray-600 dark:text-gray-300">Checking...</span>
      </div>
    )
  }

  if (!health) {
    return null
  }

  const isHealthy = health.status === 'healthy'
  const storageConnected = health.storage.connected

  return (
    <div className="flex items-center space-x-2">
      {/* Overall Status */}
      <div
        className={`
          inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
          ${isHealthy
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }
        `}
      >
        {isHealthy ? (
          <CheckCircle className="h-4 w-4 mr-1.5" />
        ) : (
          <XCircle className="h-4 w-4 mr-1.5" />
        )}
        {isHealthy ? 'Healthy' : 'Unhealthy'}
      </div>

      {/* Storage Status */}
      <div
        className={`
          inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
          ${storageConnected
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
          }
        `}
      >
        {storageConnected ? (
          <CheckCircle className="h-4 w-4 mr-1.5" />
        ) : (
          <AlertCircle className="h-4 w-4 mr-1.5" />
        )}
        <span className="capitalize">{health.storage.type}</span>
      </div>
    </div>
  )
}
