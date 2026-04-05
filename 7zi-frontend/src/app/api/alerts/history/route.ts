/**
 * Alert History API Route
 * GET /api/alerts/history - Get alert history
 * 
 * @version 1.0.0
 * @date 2026-04-03
 */

import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { 
  AlertHistory, 
  AlertHistoryResponse,
  AlertHistoryQuery,
  Severity,
  MetricType,
  Condition
} from '@/types/alerts'
import { createSuccessResponse, createBadRequestError, createNotFoundError, createErrorResponse } from '@/lib/api/error-handler'

// ============================================
// In-Memory Store (Replace with database in production)
// ============================================

// Sample initial history data
const generateSampleHistory = (): AlertHistory[] => {
  const histories: AlertHistory[] = []
  const now = Date.now()
  
  const sampleAlerts = [
    {
      ruleName: 'High CPU Usage',
      metricType: 'CPU' as MetricType,
      severity: 'warning' as Severity,
      value: 85,
      threshold: 80,
      condition: '>' as Condition,
      hoursAgo: 2
    },
    {
      ruleName: 'Memory Critical',
      metricType: 'Memory' as MetricType,
      severity: 'critical' as Severity,
      value: 92,
      threshold: 90,
      condition: '>' as Condition,
      hoursAgo: 5
    },
    {
      ruleName: 'High Response Time',
      metricType: 'ResponseTime' as MetricType,
      severity: 'warning' as Severity,
      value: 2500,
      threshold: 2000,
      condition: '>' as Condition,
      hoursAgo: 12
    },
    {
      ruleName: 'Error Rate Alert',
      metricType: 'ErrorRate' as MetricType,
      severity: 'critical' as Severity,
      value: 5,
      threshold: 3,
      condition: '>' as Condition,
      hoursAgo: 24
    },
    {
      ruleName: 'Throughput Drop',
      metricType: 'Throughput' as MetricType,
      severity: 'info' as Severity,
      value: 500,
      threshold: 1000,
      condition: '<' as Condition,
      hoursAgo: 48
    }
  ]

  sampleAlerts.forEach((alert, index) => {
    const triggeredAt = new Date(now - alert.hoursAgo * 60 * 60 * 1000)
    const isResolved = index % 2 === 0 // Some are resolved, some are active
    
    histories.push({
      id: uuidv4(),
      ruleId: uuidv4(),
      ruleName: alert.ruleName,
      metricType: alert.metricType,
      severity: alert.severity,
      value: alert.value,
      threshold: alert.threshold,
      condition: alert.condition,
      triggeredAt: triggeredAt.toISOString(),
      resolvedAt: isResolved ? new Date(triggeredAt.getTime() + 30 * 60 * 1000).toISOString() : undefined,
      status: isResolved ? 'resolved' : 'active',
      acknowledgedBy: isResolved ? 'admin@example.com' : undefined,
      acknowledgedAt: isResolved ? new Date(triggeredAt.getTime() + 5 * 60 * 1000).toISOString() : undefined,
      metadata: {
        source: 'system',
        environment: 'production'
      }
    })
  })

  return histories
}

const alertHistory: AlertHistory[] = generateSampleHistory()

// ============================================
// GET - Fetch alert history
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const ruleId = searchParams.get('ruleId') || undefined
    const severity = searchParams.get('severity') || undefined
    const status = searchParams.get('status') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    let filteredHistory = [...alertHistory]

    // Apply filters
    if (ruleId) {
      filteredHistory = filteredHistory.filter(alert => alert.ruleId === ruleId)
    }
    if (severity) {
      filteredHistory = filteredHistory.filter(alert => alert.severity === severity)
    }
    if (status) {
      filteredHistory = filteredHistory.filter(alert => alert.status === status)
    }
    if (startDate) {
      filteredHistory = filteredHistory.filter(alert => 
        new Date(alert.triggeredAt) >= new Date(startDate)
      )
    }
    if (endDate) {
      filteredHistory = filteredHistory.filter(alert => 
        new Date(alert.triggeredAt) <= new Date(endDate)
      )
    }

    // Calculate pagination
    const total = filteredHistory.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex)

    // Sort by triggeredAt descending
    paginatedHistory.sort((a, b) => 
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    )

    const response: AlertHistoryResponse = {
      alerts: paginatedHistory,
      total,
      page,
      pageSize
    }

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Error fetching alert history:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

// ============================================
// POST - Acknowledge an alert
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, acknowledgedBy } = body

    if (!alertId || !acknowledgedBy) {
      return createBadRequestError('alertId and acknowledgedBy are required')
    }

    const alertIndex = alertHistory.findIndex(a => a.id === alertId)
    if (alertIndex === -1) {
      return createNotFoundError('Alert not found')
    }

    const alert = alertHistory[alertIndex]
    alertHistory[alertIndex] = {
      ...alert,
      status: 'acknowledged',
      acknowledgedBy,
      acknowledgedAt: new Date().toISOString()
    }

    return createSuccessResponse(alertHistory[alertIndex])
  } catch (error) {
    console.error('Error acknowledging alert:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
