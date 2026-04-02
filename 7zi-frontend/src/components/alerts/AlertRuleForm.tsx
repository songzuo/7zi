'use client'

/**
 * AlertRuleForm Component - Form for creating/editing alert rules
 * 
 * @version 1.0.0
 * @date 2026-04-03
 */

import React, { useState, useCallback } from 'react'
import clsx from 'clsx'
import { 
  CreateAlertRuleDTO, 
  AlertRule,
  MetricType,
  Condition,
  Severity,
  NotificationChannel
} from '@/types/alerts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ============================================
// Constants
// ============================================

const METRIC_TYPES: { value: MetricType; label: string; description: string }[] = [
  { value: 'CPU', label: 'CPU', description: 'CPU usage percentage' },
  { value: 'Memory', label: 'Memory', description: 'Memory usage percentage' },
  { value: 'ResponseTime', label: 'Response Time', description: 'Response time in milliseconds' },
  { value: 'ErrorRate', label: 'Error Rate', description: 'Error rate percentage' },
  { value: 'Throughput', label: 'Throughput', description: 'Requests per second' }
]

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: '>', label: 'Greater than (>)' },
  { value: '<', label: 'Less than (<)' },
  { value: '>=', label: 'Greater or equal (>=)' },
  { value: '<=', label: 'Less or equal (<=)' },
  { value: '==', label: 'Equal (==)' }
]

const SEVERITIES: { value: Severity; label: string; color: string }[] = [
  { value: 'info', label: 'Info', color: 'bg-blue-500' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' }
]

const NOTIFICATION_CHANNELS: { value: NotificationChannel; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'slack', label: 'Slack', icon: '💬' },
  { value: 'webhook', label: 'Webhook', icon: '🔗' }
]

// ============================================
// Icons
// ============================================

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// ============================================
// Form Field Component
// ============================================

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

const FormField: React.FC<FormFieldProps> = ({ label, required, error, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
    )}
  </div>
)

// ============================================
// Props
// ============================================

interface AlertRuleFormProps {
  rule?: AlertRule | null
  onSave: (data: Partial<CreateAlertRuleDTO>) => Promise<void>
  onCancel: () => void
}

// ============================================
// Component
// ============================================

export const AlertRuleForm: React.FC<AlertRuleFormProps> = ({ 
  rule, 
  onSave, 
  onCancel 
}) => {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Form state
  const [name, setName] = useState(rule?.name || '')
  const [metricType, setMetricType] = useState<MetricType>(rule?.metricType || 'CPU')
  const [condition, setCondition] = useState<Condition>(rule?.condition || '>')
  const [threshold, setThreshold] = useState(rule?.threshold?.toString() || '')
  const [duration, setDuration] = useState(rule?.duration?.toString() || '300')
  const [severity, setSeverity] = useState<Severity>(rule?.severity || 'warning')
  const [channels, setChannels] = useState<NotificationChannel[]>(rule?.channels || ['email'])
  const [enabled, setEnabled] = useState(rule?.enabled ?? true)
  const [description, setDescription] = useState(rule?.description || '')

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    } else if (name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters'
    }

    const thresholdNum = parseFloat(threshold)
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      newErrors.threshold = 'Threshold must be a positive number'
    }

    const durationNum = parseInt(duration)
    if (isNaN(durationNum) || durationNum < 0) {
      newErrors.duration = 'Duration must be a positive number'
    }

    if (channels.length === 0) {
      newErrors.channels = 'At least one channel is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [name, threshold, duration, channels])

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    setLoading(true)
    try {
      await onSave({
        name: name.trim(),
        metricType,
        condition,
        threshold: parseFloat(threshold),
        duration: parseInt(duration),
        severity,
        channels,
        enabled,
        description: description.trim() || undefined
      })
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setLoading(false)
    }
  }

  // Toggle channel
  const toggleChannel = (channel: NotificationChannel) => {
    setChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {rule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        </h2>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Name */}
        <FormField label="Rule Name" required error={errors.name}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., High CPU Usage Alert"
            className={clsx(
              'w-full px-4 py-2 border-2 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
              errors.name ? 'border-red-300' : 'border-gray-300'
            )}
          />
        </FormField>

        {/* Metric Type */}
        <FormField label="Metric Type" required>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {METRIC_TYPES.map((metric) => (
              <button
                key={metric.value}
                type="button"
                onClick={() => setMetricType(metric.value)}
                className={clsx(
                  'p-3 border-2 rounded-lg text-left transition-all',
                  metricType === metric.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                )}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {metric.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {metric.description}
                </div>
              </button>
            ))}
          </div>
        </FormField>

        {/* Condition & Threshold */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Condition" required>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className={clsx(
                'w-full px-4 py-2 border-2 rounded-lg',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100'
              )}
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Threshold" required error={errors.threshold}>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g., 80"
              min="0"
              className={clsx(
                'w-full px-4 py-2 border-2 rounded-lg',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                errors.threshold ? 'border-red-300' : 'border-gray-300'
              )}
            />
          </FormField>
        </div>

        {/* Duration */}
        <FormField label="Duration (seconds)" required error={errors.duration}>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 300"
            min="0"
            className={clsx(
              'w-full px-4 py-2 border-2 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
              errors.duration ? 'border-red-300' : 'border-gray-300'
            )}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            How long the condition must persist before triggering
          </p>
        </FormField>

        {/* Severity */}
        <FormField label="Severity" required>
          <div className="flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSeverity(s.value)}
                className={clsx(
                  'flex-1 py-2 px-4 border-2 rounded-lg font-medium transition-all',
                  severity === s.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                )}
              >
                <span className={clsx('inline-block w-2 h-2 rounded-full mr-2', s.color)} />
                {s.label}
              </button>
            ))}
          </div>
        </FormField>

        {/* Notification Channels */}
        <FormField label="Notification Channels" required error={errors.channels}>
          <div className="flex gap-2">
            {NOTIFICATION_CHANNELS.map((ch) => (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value)}
                className={clsx(
                  'flex-1 py-3 px-4 border-2 rounded-lg font-medium transition-all',
                  channels.includes(ch.value)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                )}
              >
                <span className="mr-2">{ch.icon}</span>
                {ch.label}
              </button>
            ))}
          </div>
        </FormField>

        {/* Description */}
        <FormField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this alert rule"
            rows={2}
            className={clsx(
              'w-full px-4 py-2 border-2 rounded-lg resize-none',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100'
            )}
          />
        </FormField>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Enable Rule
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Active rules will trigger alerts when conditions are met
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={clsx(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <span
              className={clsx(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                enabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {/* Error */}
        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default AlertRuleForm
