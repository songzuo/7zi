/**
 * Rate Limit Stats Component
 * 
 * Displays overall rate limiting statistics and metrics
 * 
 * @version 1.12.0
 */

import { 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  Clock,
  Layers,
  BarChart3
} from 'lucide-react'
import type { RateLimitStats as RateLimitStatsType } from '../hooks/useRateLimitApi'
import { formatNumber, formatPercent } from '../hooks/useRateLimitApi'

interface RateLimitStatsProps {
  stats?: RateLimitStatsType
  loading: boolean
}

export function RateLimitStats({ stats, loading }: RateLimitStatsProps) {
  if (loading || !stats) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const totalRequests = stats.totalRequests || 0
  const allowedRequests = stats.allowedRequests || 0
  const rejectedRequests = stats.rejectedRequests || 0
  const rejectionRate = stats.rejectionRate || 0
  const avgLatency = stats.avgLatencyMs || 0
  const p99Latency = stats.p99LatencyMs || 0

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Requests
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {formatNumber(totalRequests)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Allowed Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Allowed Requests
              </p>
              <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
                {formatNumber(allowedRequests)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Rejected Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Rejected Requests
              </p>
              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                {formatNumber(rejectedRequests)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Rejection Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Rejection Rate
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {formatPercent(rejectionRate)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <BarChart3 className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Average Latency */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Metrics
            </h3>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Average Latency
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {avgLatency.toFixed(2)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                P99 Latency
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {p99Latency.toFixed(2)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Storage Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Storage Backend
            </h3>
            <Layers className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Type
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {stats.storage?.type || 'unknown'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Status
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                stats.storage?.connected
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {stats.storage?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Layer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Requests by Layer
        </h3>
        <div className="space-y-4">
          {Object.entries(stats.byLayer).map(([layer, data]) => {
            const total = data.allowed + data.rejected
            const allowedPercent = total > 0 ? (data.allowed / total) * 100 : 0
            return (
              <div key={layer}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {layer.replace('-', ' ')}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(data.allowed)} allowed
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(data.rejected)} rejected
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${allowedPercent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Breakdown by Algorithm */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Requests by Algorithm
        </h3>
        <div className="space-y-4">
          {Object.entries(stats.byAlgorithm).map(([algorithm, data]) => {
            const total = data.allowed + data.rejected
            const allowedPercent = total > 0 ? (data.allowed / total) * 100 : 0
            return (
              <div key={algorithm}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {algorithm.replace('-', ' ')}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(data.allowed)} allowed
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(data.rejected)} rejected
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${allowedPercent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
