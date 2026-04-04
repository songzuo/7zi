/**
 * Rate Limit Admin Panel - Main Page
 *
 * Admin panel for managing API rate limiting configuration
 *
 * @version 1.12.0
 */

"use client"

import { useState, useEffect } from 'react'
import {
  Shield,
  Activity,
  Key,
  Globe,
  FileText,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { RateLimitStats } from './components/RateLimitStats'
import { ApiKeyConfig } from './components/ApiKeyConfig'
import { WhitelistManager } from './components/WhitelistManager'
import { RequestLogs } from './components/RequestLogs'
import { HealthStatus } from './components/HealthStatus'
import { useRateLimitStats, useRateLimitHealth } from './hooks/useRateLimitApi'

type TabType = 'dashboard' | 'apikeys' | 'whitelist' | 'logs'

export default function RateLimitAdminPage() {
  const t = useTranslations('admin.rateLimit')
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useRateLimitStats()

  const {
    health,
    loading: healthLoading,
    refresh: refreshHealth
  } = useRateLimitHealth()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refreshStats(), refreshHealth()])
    setIsRefreshing(false)
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStats()
      refreshHealth()
    }, 30000)
    return () => clearInterval(interval)
  }, [refreshStats, refreshHealth])

  const tabs = [
    { id: 'dashboard' as TabType, label: t('tabs.dashboard'), icon: Activity },
    { id: 'apikeys' as TabType, label: t('tabs.apiKeys'), icon: Key },
    { id: 'whitelist' as TabType, label: t('tabs.whitelist'), icon: Globe },
    { id: 'logs' as TabType, label: t('tabs.logs'), icon: FileText },
  ]

  const isLoading = statsLoading || healthLoading
  const isHealthy = health?.data?.status === 'healthy'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Health Status Badge */}
              <HealthStatus
                health={health?.data}
                loading={healthLoading}
              />

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {statsError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {t('errors.statsLoadFailed')}
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                {statsError.message}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <RateLimitStats stats={stats?.data} loading={statsLoading} />
        )}

        {activeTab === 'apikeys' && (
          <ApiKeyConfig />
        )}

        {activeTab === 'whitelist' && (
          <WhitelistManager />
        )}

        {activeTab === 'logs' && (
          <RequestLogs />
        )}
      </div>
    </div>
  )
}
