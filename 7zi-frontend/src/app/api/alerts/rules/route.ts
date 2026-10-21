/**
 * Alert Rules API Route
 * GET /api/alerts/rules - Get all alert rules
 * POST /api/alerts/rules - Create a new alert rule
 * 
 * @version 1.0.0
 * @date 2026-04-03
 */

import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import {
  AlertRule,
  CreateAlertRuleDTO,
  AlertRulesResponse,
  MetricType,
  Condition,
  Severity,
  NotificationChannel
} from '@/types/alerts'
import { createSuccessResponse, createBadRequestError, createErrorResponse } from '@/lib/api/error-handler'
import { withCSRF } from '@/lib/middleware/csrf'

// ============================================
// In-Memory Store (Replace with database in production)
// ============================================

// Sample initial data
const initialRules: AlertRule[] = [
  {
    id: uuidv4(),
    name: 'High CPU Usage',
    metricType: 'CPU',
    condition: '>',
    threshold: 80,
    duration: 300, // 5 minutes
    severity: 'warning',
    channels: ['email', 'slack'],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Alert when CPU usage exceeds 80% for 5 minutes'
  },
  {
    id: uuidv4(),
    name: 'Memory Critical',
    metricType: 'Memory',
    condition: '>',
    threshold: 90,
    duration: 180, // 3 minutes
    severity: 'critical',
    channels: ['email', 'slack', 'webhook'],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Critical alert when memory usage exceeds 90%'
  },
  {
    id: uuidv4(),
    name: 'High Response Time',
    metricType: 'ResponseTime',
    condition: '>',
    threshold: 2000,
    duration: 600, // 10 minutes
    severity: 'warning',
    channels: ['email'],
    enabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Alert when response time exceeds 2 seconds'
  }
]

const alertRules: AlertRule[] = [...initialRules]

// ============================================
// Validation Helpers
// ============================================

function validateAlertRule(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid request body'] }
  }

  const rule = data as Record<string, unknown>

  // Name validation
  if (!rule.name || typeof rule.name !== 'string' || rule.name.trim().length === 0) {
    errors.push('Name is required')
  } else if (rule.name.length > 100) {
    errors.push('Name must be less than 100 characters')
  }

  // Metric type validation
  const validMetricTypes: MetricType[] = ['CPU', 'Memory', 'ResponseTime', 'ErrorRate', 'Throughput']
  if (!rule.metricType || !validMetricTypes.includes(rule.metricType as MetricType)) {
    errors.push(`Invalid metricType. Must be one of: ${validMetricTypes.join(', ')}`)
  }

  // Condition validation
  const validConditions: Condition[] = ['>', '<', '>=', '<=', '==']
  if (!rule.condition || !validConditions.includes(rule.condition as Condition)) {
    errors.push(`Invalid condition. Must be one of: ${validConditions.join(', ')}`)
  }

  // Threshold validation
  if (rule.threshold === undefined || typeof rule.threshold !== 'number' || rule.threshold < 0) {
    errors.push('Threshold must be a positive number')
  }

  // Duration validation
  if (rule.duration === undefined || typeof rule.duration !== 'number' || rule.duration < 0) {
    errors.push('Duration must be a positive number (in seconds)')
  }

  // Severity validation
  const validSeverities: Severity[] = ['info', 'warning', 'critical']
  if (!rule.severity || !validSeverities.includes(rule.severity as Severity)) {
    errors.push(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`)
  }

  // Channels validation
  const validChannels: NotificationChannel[] = ['email', 'slack', 'webhook']
  if (!rule.channels || !Array.isArray(rule.channels) || rule.channels.length === 0) {
    errors.push('At least one notification channel is required')
  } else {
    const invalidChannels = rule.channels.filter((ch: unknown) => 
      !validChannels.includes(ch as NotificationChannel)
    )
    if (invalidChannels.length > 0) {
      errors.push(`Invalid channels: ${invalidChannels.join(', ')}. Must be one of: ${validChannels.join(', ')}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// ============================================
// GET - Fetch all alert rules
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const enabled = searchParams.get('enabled')
    const severity = searchParams.get('severity')
    const metricType = searchParams.get('metricType')

    let filteredRules = [...alertRules]

    // Apply filters
    if (enabled !== null) {
      filteredRules = filteredRules.filter(rule => rule.enabled === (enabled === 'true'))
    }
    if (severity) {
      filteredRules = filteredRules.filter(rule => rule.severity === severity)
    }
    if (metricType) {
      filteredRules = filteredRules.filter(rule => rule.metricType === metricType)
    }

    // Calculate pagination
    const total = filteredRules.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedRules = filteredRules.slice(startIndex, endIndex)

    // Sort by updatedAt descending
    paginatedRules.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    const response: AlertRulesResponse = {
      rules: paginatedRules,
      total,
      page,
      pageSize
    }

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Error fetching alert rules:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

// ============================================
// POST - Create a new alert rule
// Requires CSRF protection
// ============================================

export const POST = withCSRF(async (request: NextRequest) => {
  try {
    const body = await request.json()

    // Validate the request body
    const validation = validateAlertRule(body)
    if (!validation.valid) {
      return createBadRequestError('Validation failed', { details: validation.errors })
    }

    const now = new Date().toISOString()
    const newRule: AlertRule = {
      id: uuidv4(),
      name: body.name.trim(),
      metricType: body.metricType,
      condition: body.condition,
      threshold: body.threshold,
      duration: body.duration,
      severity: body.severity,
      channels: body.channels,
      enabled: body.enabled ?? true,
      description: body.description,
      createdAt: now,
      updatedAt: now
    }

    alertRules.push(newRule)

    return createSuccessResponse(newRule, 201)
  } catch (error) {
    console.error('Error creating alert rule:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
})
