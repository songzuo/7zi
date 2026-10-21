/**
 * FeedbackStatusTracker - 反馈状态追踪组件
 *
 * Features:
 * - 显示反馈状态流转（已提交 → 已查看 → 已处理 → 已解决）
 * - 时间线展示
 * - 状态图标和颜色
 * - 支持国际化
 */

'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n/client'
import type { FeedbackStatus } from '@/lib/db/feedback-types'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Archive,
  Eye,
  Wrench,
  Sparkles,
} from 'lucide-react'

interface FeedbackStatusTrackerProps {
  currentStatus: FeedbackStatus
  createdAt: number
  viewedAt?: number
  processingAt?: number
  resolvedAt?: number
  closedAt?: number
  rejectedAt?: number
  showLabels?: boolean
  compact?: boolean
}

interface StatusStep {
  status: FeedbackStatus
  icon: React.ReactNode
  labelKey: string
  color: string
  bgColor: string
}

const STATUS_STEPS: StatusStep[] = [
  {
    status: 'pending',
    icon: <Clock className="h-5 w-5" />,
    labelKey: 'feedback.status.pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    status: 'in_progress',
    icon: <Wrench className="h-5 w-5" />,
    labelKey: 'feedback.status.inProgress',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    status: 'resolved',
    icon: <CheckCircle2 className="h-5 w-5" />,
    labelKey: 'feedback.status.resolved',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    status: 'closed',
    icon: <Archive className="h-5 w-5" />,
    labelKey: 'feedback.status.closed',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  {
    status: 'rejected',
    icon: <XCircle className="h-5 w-5" />,
    labelKey: 'feedback.status.rejected',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
]

const STATUS_ORDER: FeedbackStatus[] = ['pending', 'in_progress', 'resolved', 'closed', 'rejected']

export default function FeedbackStatusTracker({
  currentStatus,
  createdAt,
  viewedAt,
  processingAt,
  resolvedAt,
  closedAt,
  rejectedAt,
  showLabels = true,
  compact = false,
}: FeedbackStatusTrackerProps) {
  const { t } = useTranslation('feedback')

  const getStatusIndex = (status: FeedbackStatus) => STATUS_ORDER.indexOf(status)

  const currentIndex = getStatusIndex(currentStatus)

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return null
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStepTimestamp = (status: FeedbackStatus) => {
    switch (status) {
      case 'pending':
        return createdAt
      case 'in_progress':
        return processingAt || viewedAt
      case 'resolved':
        return resolvedAt
      case 'closed':
        return closedAt
      case 'rejected':
        return rejectedAt
      default:
        return undefined
    }
  }

  const isStepCompleted = (status: FeedbackStatus) => {
    const stepIndex = getStatusIndex(status)

    // Rejected is a special case - it can happen at any point
    if (currentStatus === 'rejected') {
      return status === 'rejected' || stepIndex < currentIndex
    }

    return stepIndex < currentIndex
  }

  const isStepCurrent = (status: FeedbackStatus) => status === currentStatus

  const isStepPending = (status: FeedbackStatus) => {
    const stepIndex = getStatusIndex(status)
    return stepIndex > currentIndex
  }

  if (compact) {
    const currentStep = STATUS_STEPS.find(s => s.status === currentStatus)
    return (
      <div className={`inline-flex items-center space-x-2 rounded-full px-3 py-1 ${currentStep?.bgColor}`}>
        {currentStep?.icon}
        <span className={`text-sm font-medium ${currentStep?.color}`}>
          {t(currentStep?.labelKey || '')}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-gray-200" />
        <div className="relative flex justify-between">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = isStepCompleted(step.status)
            const isCurrent = isStepCurrent(step.status)
            const isPending = isStepPending(step.status)

            return (
              <div key={step.status} className="flex flex-col items-center">
                <div
                  className={`
                    relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all
                    ${
                      isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : isCurrent
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300 bg-white text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>

                {showLabels && (
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {t(step.labelKey)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {STATUS_STEPS.map((step) => {
          const timestamp = getStepTimestamp(step.status)
          const isCompleted = isStepCompleted(step.status)
          const isCurrent = isStepCurrent(step.status)

          if (!timestamp && !isCurrent) return null

          return (
            <div key={step.status} className="flex items-start space-x-3">
              <div
                className={`
                  mt-0.5 flex h-6 w-6 items-center justify-center rounded-full
                  ${isCompleted ? step.bgColor : isCurrent ? step.bgColor : 'bg-gray-100'}
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className={`h-4 w-4 ${step.color}`} />
                ) : (
                  <span className={`text-xs ${step.color}`}>{step.icon}</span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {t(step.labelKey)}
                  </p>
                  {timestamp && (
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(timestamp)}
                    </p>
                  )}
                </div>

                {isCurrent && (
                  <p className="mt-1 text-xs text-blue-600">
                    {t('feedback.status.current')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * FeedbackStatusBadge - 状态徽章组件
 */

interface FeedbackStatusBadgeProps {
  status: FeedbackStatus
  size?: 'sm' | 'md' | 'lg'
}

export function FeedbackStatusBadge({ status, size = 'md' }: FeedbackStatusBadgeProps) {
  const { t } = useTranslation('feedback')

  const step = STATUS_STEPS.find(s => s.status === status)
  if (!step) return null

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={`inline-flex items-center space-x-1.5 rounded-full ${step.bgColor} ${step.color} ${sizeClasses[size]}`}
    >
      {step.icon}
      <span className="font-medium">{t(step.labelKey)}</span>
    </span>
  )
}

/**
 * FeedbackStatusTimeline - 详细时间线组件
 */

interface FeedbackStatusTimelineProps {
  events: {
    status: FeedbackStatus
    timestamp: number
    actor?: string
    note?: string
  }[]
}

export function FeedbackStatusTimeline({ events }: FeedbackStatusTimelineProps) {
  const { t } = useTranslation('feedback')

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const step = STATUS_STEPS.find(s => s.status === event.status)
        if (!step) return null

        const isLast = index === events.length - 1

        return (
          <div key={index} className="relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-3 top-8 h-full w-0.5 bg-gray-200" />
            )}

            <div className="flex items-start space-x-3">
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${step.bgColor}`}
              >
                {step.icon}
              </div>

              <div className="flex-1 rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {t(step.labelKey)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimestamp(event.timestamp)}
                  </p>
                </div>

                {event.actor && (
                  <p className="mt-1 text-xs text-gray-600">
                    {t('feedback.status.by')}: {event.actor}
                  </p>
                )}

                {event.note && (
                  <p className="mt-2 text-sm text-gray-700">{event.note}</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}