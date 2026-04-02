'use client'

/**
 * AlertsPage Component - Main alerts configuration page
 * 
 * @version 1.0.0
 * @date 2026-04-03
 */

import React, { useState, useCallback, useEffect } from 'react'
import clsx from 'clsx'
import { 
  AlertRule, 
  AlertRulesResponse,
  AlertHistoryResponse,
  MetricType,
  Severity
} from '@/types/alerts'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { AlertRuleForm } from './AlertRuleForm'
import { AlertHistoryList } from './AlertHistory'

// ============================================
// Types
// ============================================

type Tab = 'rules' | 'history'

// ============================================
// Icons
// ============================================

const BellIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

// ============================================
// Severity Badge Component
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
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      styles[severity]
    )}>
      {severity.toUpperCase()}
    </span>
  )
}

// ============================================
// Metric Type Badge Component
// ============================================

interface MetricBadgeProps {
  metricType: MetricType
}

const MetricBadge: React.FC<MetricBadgeProps> = ({ metricType }) => {
  const styles = {
    CPU: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Memory: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    ResponseTime: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    ErrorRate: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Throughput: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      styles[metricType]
    )}>
      {metricType}
    </span>
  )
}

// ============================================
// Alert Rule Card Component
// ============================================

interface AlertRuleCardProps {
  rule: AlertRule
  onEdit: (rule: AlertRule) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}

const AlertRuleCard: React.FC<AlertRuleCardProps> = ({ rule, onEdit, onDelete, onToggle }) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return
    setIsDeleting(true)
    try {
      await onDelete(rule.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="mb-3 hover:shadow-lg transition-shadow">
      <CardBody className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {rule.name}
              </h3>
              <SeverityBadge severity={rule.severity} />
              <MetricBadge metricType={rule.metricType} />
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {rule.description || 'No description'}
            </p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>
                Condition: <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                  {rule.metricType} {rule.condition} {rule.threshold}
                </code>
              </span>
              <span>
                Duration: <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                  {rule.duration}s
                </code>
              </span>
              <span>
                Channels: {rule.channels.join(', ')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {/* Toggle Switch */}
            <button
              onClick={() => onToggle(rule.id, !rule.enabled)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                rule.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              )}
              title={rule.enabled ? 'Disable rule' : 'Enable rule'}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  rule.enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(rule)}
            >
              Edit
            </Button>
            
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// ============================================
// Main AlertsPage Component
// ============================================

export const AlertsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('rules')
  const [rules, setRules] = useState<AlertRule[]>([])
  const [history, setHistory] = useState<AlertHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    enabled: 0,
    critical: 0
  })

  // Fetch rules
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/alerts/rules')
      if (!response.ok) throw new Error('Failed to fetch rules')
      const data: AlertRulesResponse = await response.json()
      setRules(data.rules)
      setStats({
        total: data.total,
        enabled: data.rules.filter(r => r.enabled).length,
        critical: data.rules.filter(r => r.severity === 'critical').length
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/alerts/history')
      if (!response.ok) throw new Error('Failed to fetch history')
      const data: AlertHistoryResponse = await response.json()
      setHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (activeTab === 'rules') {
      fetchRules()
    } else {
      fetchHistory()
    }
  }, [activeTab, fetchRules, fetchHistory])

  // Handle create/edit rule
  const handleSaveRule = async (ruleData: Partial<AlertRule>) => {
    try {
      const isEdit = !!editingRule
      const url = isEdit 
        ? `/api/alerts/rules/${editingRule.id}` 
        : '/api/alerts/rules'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save rule')
      }

      setShowForm(false)
      setEditingRule(null)
      fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule')
    }
  }

  // Handle delete rule
  const handleDeleteRule = async (id: string) => {
    try {
      const response = await fetch(`/api/alerts/rules/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete rule')
      fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    }
  }

  // Handle toggle rule
  const handleToggleRule = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/alerts/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })

      if (!response.ok) throw new Error('Failed to update rule')
      fetchRules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule')
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    if (activeTab === 'rules') {
      fetchRules()
    } else {
      fetchHistory()
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <BellIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Alert Rules
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure and manage performance alert rules
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshIcon />
            <span className="ml-2">Refresh</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingRule(null)
              setShowForm(true)
            }}
          >
            <PlusIcon />
            <span className="ml-2">New Rule</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardBody className="p-4 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Rules
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.enabled}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Enabled
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.critical}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Critical Alerts
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('rules')}
          className={clsx(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'rules'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          )}
        >
          Alert Rules
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={clsx(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          )}
        >
          Alert History
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : activeTab === 'rules' ? (
        <div>
          {rules.length === 0 ? (
            <Card>
              <CardBody className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <BellIcon />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Alert Rules
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Get started by creating your first alert rule.
                </p>
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingRule(null)
                    setShowForm(true)
                  }}
                >
                  <PlusIcon />
                  <span className="ml-2">Create Rule</span>
                </Button>
              </CardBody>
            </Card>
          ) : (
            <div>
              {rules.map(rule => (
                <AlertRuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={(r) => {
                    setEditingRule(r)
                    setShowForm(true)
                  }}
                  onDelete={handleDeleteRule}
                  onToggle={handleToggleRule}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <AlertHistoryList history={history?.alerts || []} />
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <AlertRuleForm
              rule={editingRule}
              onSave={handleSaveRule}
              onCancel={() => {
                setShowForm(false)
                setEditingRule(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertsPage
