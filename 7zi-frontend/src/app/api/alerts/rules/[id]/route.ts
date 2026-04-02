/**
 * Alert Rule by ID API Route
 * GET /api/alerts/rules/[id] - Get a specific alert rule
 * PUT /api/alerts/rules/[id] - Update an alert rule
 * DELETE /api/alerts/rules/[id] - Delete an alert rule
 * 
 * @version 1.0.0
 * @date 2026-04-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  AlertRule, 
  UpdateAlertRuleDTO,
  MetricType,
  Condition,
  Severity,
  NotificationChannel
} from '@/types/alerts'

// Import the shared store (in production, this would be a database)
const getAlertRulesStore = () => {
  // This is a workaround for module-level state sharing
  // In production, use a database
  return globalThis.alertRulesStore || []
}

// ============================================
// Validation Helpers
// ============================================

function validatePartialAlertRule(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid request body'] }
  }

  const rule = data as Record<string, unknown>

  // Name validation (optional for updates)
  if (rule.name !== undefined) {
    if (typeof rule.name !== 'string' || rule.name.trim().length === 0) {
      errors.push('Name cannot be empty')
    } else if (rule.name.length > 100) {
      errors.push('Name must be less than 100 characters')
    }
  }

  // Metric type validation (optional)
  if (rule.metricType !== undefined) {
    const validMetricTypes: MetricType[] = ['CPU', 'Memory', 'ResponseTime', 'ErrorRate', 'Throughput']
    if (!validMetricTypes.includes(rule.metricType as MetricType)) {
      errors.push(`Invalid metricType. Must be one of: ${validMetricTypes.join(', ')}`)
    }
  }

  // Condition validation (optional)
  if (rule.condition !== undefined) {
    const validConditions: Condition[] = ['>', '<', '>=', '<=', '==']
    if (!validConditions.includes(rule.condition as Condition)) {
      errors.push(`Invalid condition. Must be one of: ${validConditions.join(', ')}`)
    }
  }

  // Threshold validation (optional)
  if (rule.threshold !== undefined) {
    if (typeof rule.threshold !== 'number' || rule.threshold < 0) {
      errors.push('Threshold must be a positive number')
    }
  }

  // Duration validation (optional)
  if (rule.duration !== undefined) {
    if (typeof rule.duration !== 'number' || rule.duration < 0) {
      errors.push('Duration must be a positive number (in seconds)')
    }
  }

  // Severity validation (optional)
  if (rule.severity !== undefined) {
    const validSeverities: Severity[] = ['info', 'warning', 'critical']
    if (!validSeverities.includes(rule.severity as Severity)) {
      errors.push(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`)
    }
  }

  // Channels validation (optional)
  if (rule.channels !== undefined) {
    const validChannels: NotificationChannel[] = ['email', 'slack', 'webhook']
    if (!Array.isArray(rule.channels) || rule.channels.length === 0) {
      errors.push('At least one notification channel is required')
    } else {
      const invalidChannels = rule.channels.filter((ch: unknown) => 
        !validChannels.includes(ch as NotificationChannel)
      )
      if (invalidChannels.length > 0) {
        errors.push(`Invalid channels: ${invalidChannels.join(', ')}. Must be one of: ${validChannels.join(', ')}`)
      }
    }
  }

  // Enabled validation (optional)
  if (rule.enabled !== undefined && typeof rule.enabled !== 'boolean') {
    errors.push('Enabled must be a boolean')
  }

  return { valid: errors.length === 0, errors }
}

// ============================================
// GET - Fetch a specific alert rule
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rules = getAlertRulesStore()
    const rule = rules.find((r: AlertRule) => r.id === id)

    if (!rule) {
      return NextResponse.json(
        { error: 'Alert rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error fetching alert rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alert rule' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - Update an alert rule
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate the request body
    const validation = validatePartialAlertRule(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // Get the store and find the rule
    const rules = getAlertRulesStore()
    const ruleIndex = rules.findIndex((r: AlertRule) => r.id === id)

    if (ruleIndex === -1) {
      return NextResponse.json(
        { error: 'Alert rule not found' },
        { status: 404 }
      )
    }

    // Update the rule
    const existingRule = rules[ruleIndex]
    const updatedRule: AlertRule = {
      ...existingRule,
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.metricType !== undefined && { metricType: body.metricType }),
      ...(body.condition !== undefined && { condition: body.condition }),
      ...(body.threshold !== undefined && { threshold: body.threshold }),
      ...(body.duration !== undefined && { duration: body.duration }),
      ...(body.severity !== undefined && { severity: body.severity }),
      ...(body.channels !== undefined && { channels: body.channels }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.description !== undefined && { description: body.description }),
      updatedAt: new Date().toISOString()
    }

    rules[ruleIndex] = updatedRule

    return NextResponse.json(updatedRule)
  } catch (error) {
    console.error('Error updating alert rule:', error)
    return NextResponse.json(
      { error: 'Failed to update alert rule' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - Delete an alert rule
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rules = getAlertRulesStore()
    const ruleIndex = rules.findIndex((r: AlertRule) => r.id === id)

    if (ruleIndex === -1) {
      return NextResponse.json(
        { error: 'Alert rule not found' },
        { status: 404 }
      )
    }

    // Remove the rule
    rules.splice(ruleIndex, 1)

    return NextResponse.json(
      { message: 'Alert rule deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting alert rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete alert rule' },
      { status: 500 }
    )
  }
}
