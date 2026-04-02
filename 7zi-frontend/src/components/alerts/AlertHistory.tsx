'use client'

/**
 * AlertHistory Component - Displays alert history list
 * 
 * @version 1.0.0
 * @date 2026-04-03
 */

import React, { useState } from 'react'
import clsx from 'clsx'
import { 
  AlertHistory as AlertHistoryType,
  Severity,
  MetricType,
  Condition
} from '@/types/alerts'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

// ============================================
// Icons
// ============================================

const AlertCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// ============================================
// Helper Functions
// ============================================

const formatTime = (isoString: string) => {
  const date = new Date(isoString)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (startTime: string, endTime?: string) => {
  if (!endTime) return 'Active'
  
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const durationMs = end - start
  
  const minutes = Math.floor(durationMs / 60000)
  if (minutes < 60) return `${minutes}m`
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return `${hours}h ${remainingMinutes}m`
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
}

// ============================================
// Severity Badge
// ============================================

interface SeverityBadgeProps {
  severity: Severity
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const styles = {
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      styles[severity]
    )}>
      {severity.toUpperCase()}
    </span>
  )
}

// ============================================
// Status Badge
// ============================================

interface StatusBadgeProps {
  status: 'active' | 'resolved' | 'acknowledged'
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    active: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    acknowledged: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }

  const icons = {
    active: <AlertCircleIcon />,
    resolved: <CheckCircleIcon />,
    acknowledged: <ClockIcon />
  }

  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
      styles[status]
    )}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ============================================
// Alert History Item
// ============================================

interface AlertHistoryItemProps {
  alert: AlertHistoryType
  onAcknowledge?: (id: string) => void
}

const AlertHistoryItem: React.FC<AlertHistoryItemProps> = ({ alert, onAcknowledge }) => {
  const [isAcknowledging, setIsAcknowledging] = useState(false)

  const handleAcknowledge = async () => {
    if (!onAcknowledge) return
    setIsAcknowledging(true)
    try {
      await onAcknowledge(alert.id)
    } finally {
      setIsAcknowledging(false)
    }
  }

  return (
    <Card className="mb-3">
      <CardBody className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {alert.ruleName}
              </h4>
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>

            {/* Details */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                  {alert.metricType} {alert.condition} {alert.threshold}
                </code>
                {' → '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {alert.value}
                </span>
              </span>
            </div>

            {/* Timestamps */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <ClockIcon />
                Triggered: {formatTime(alert.triggeredAt)}
              </span>
              {alert.resolvedAt && (
                <span>
                  Resolved: {formatTime(alert.resolvedAt)}
                  {' '}({formatDuration(alert.triggeredAt, alert.resolvedAt)})
                </span>
              )}
              {alert.acknowledgedBy && (
                <span>
                  Acknowledged by: {alert.acknowledgedBy}
                </span>
              )}
            </div>
          </div>

          {/* Action */}
          {alert.status === 'active' && onAcknowledge && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcknowledge}
              loading={isAcknowledging}
            >
              Acknowledge
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

// ============================================
// Main AlertHistory Component
// ============================================

interface AlertHistoryListProps {
  history: AlertHistoryType[]
  onAcknowledge?: (id: string) => Promise<void>
}

export const AlertHistoryList: React.FC<AlertHistoryListProps> = ({ 
  history,
  onAcknowledge 
}) => {
  if (history.length === 0) {
    return (
      <Card>
        <CardBody className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <CheckCircleIcon />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Alert History
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No alerts have been triggered yet.
          </p>
        </CardBody>
      </Card>
    )
  }

  // Group alerts by date
  const groupedHistory = history.reduce((groups, alert) => {
    const date = new Date(alert.triggeredAt).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(alert)
    
    return groups
  }, {} as Record<string, AlertHistoryType[]>)

  return (
    <div>
      {Object.entries(groupedHistory).map(([date, alerts]) => (
        <div key={date} className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            {date}
          </h3>
          {alerts.map((alert) => (
            <AlertHistoryItem 
              key={alert.id} 
              alert={alert}
              onAcknowledge={onAcknowledge}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ============================================
// Filter Controls
// ============================================

export interface AlertHistoryFilters {
  status?: 'active' | 'resolved' | 'acknowledged'
  severity?: Severity
  metricType?: MetricType
}

interface AlertHistoryFilterProps {
  filters: AlertHistoryFilters
  onFilterChange: (filters: AlertHistoryFilters) => void
}

export const AlertHistoryFilter: React.FC<AlertHistoryFilterProps> = ({
  filters,
  onFilterChange
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* Status Filter */}
      <select
        value={filters.status || ''}
        onChange={(e) => onFilterChange({ 
          ...filters, 
          status: e.target.value as AlertHistoryFilters['status'] || undefined 
        })}
        className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="resolved">Resolved</option>
        <option value="acknowledged">Acknowledged</option>
      </select>

      {/* Severity Filter */}
      <select
        value={filters.severity || ''}
        onChange={(e) => onFilterChange({ 
          ...filters, 
          severity: e.target.value as Severity || undefined 
        })}
        className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
      >
        <option value="">All Severity</option>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="critical">Critical</option>
      </select>

      {/* Metric Type Filter */}
      <select
        value={filters.metricType || ''}
        onChange={(e) => onFilterChange({ 
          ...filters, 
          metricType: e.target.value as MetricType || undefined 
        })}
        className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
      >
        <option value="">All Metrics</option>
        <option value="CPU">CPU</option>
        <option value="Memory">Memory</option>
        <option value="ResponseTime">Response Time</option>
        <option value="ErrorRate">Error Rate</option>
        <option value="Throughput">Throughput</option>
      </select>
    </div>
  )
}

export default AlertHistoryList
