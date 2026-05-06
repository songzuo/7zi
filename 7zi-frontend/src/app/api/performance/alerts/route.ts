/**
 * Slow Query Alerts API
 *
 * 提供慢查询检测和告警功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateSecureId } from '@/lib/utils'
import { QueryOptimizer } from '@/lib/db/query-optimizer'

/**
 * 告警规则接口
 */
export interface AlertRule {
  id: string
  name: string
  type: 'slow_query' | 'n1_query' | 'low_cache_hit' | 'high_error_rate'
  enabled: boolean
  threshold: number
  severity: 'info' | 'warning' | 'error' | 'critical'
  notificationChannels: string[]
}

/**
 * 告警接口
 */
export interface Alert {
  id: string
  ruleId: string
  type: string
  severity: string
  message: string
  details: Record<string, unknown>
  timestamp: number
  acknowledged: boolean
}

// 全局实例
let queryOptimizer: QueryOptimizer | null = null
let alertRules: AlertRule[] = []
let alerts: Alert[] = []

/**
 * 初始化默认告警规则
 */
function initializeDefaultRules() {
  if (alertRules.length === 0) {
    alertRules = [
      {
        id: 'slow_query_1s',
        name: 'Slow Query (>1s)',
        type: 'slow_query',
        enabled: true,
        threshold: 1000,
        severity: 'warning',
        notificationChannels: ['log'],
      },
      {
        id: 'slow_query_5s',
        name: 'Very Slow Query (>5s)',
        type: 'slow_query',
        enabled: true,
        threshold: 5000,
        severity: 'error',
        notificationChannels: ['log', 'email'],
      },
      {
        id: 'n1_query',
        name: 'N+1 Query Detected',
        type: 'n1_query',
        enabled: true,
        threshold: 5,
        severity: 'warning',
        notificationChannels: ['log'],
      },
      {
        id: 'low_cache_hit',
        name: 'Low Cache Hit Rate (<50%)',
        type: 'low_cache_hit',
        enabled: true,
        threshold: 0.5,
        severity: 'info',
        notificationChannels: ['log'],
      },
    ]
  }
}

/**
 * 获取查询优化器实例
 */
function getQueryOptimizer(): QueryOptimizer {
  if (!queryOptimizer) {
    queryOptimizer = new QueryOptimizer()
  }
  return queryOptimizer
}

/**
 * 检查告警规则
 */
function checkAlertRules(): Alert[] {
  const optimizer = getQueryOptimizer()
  const newAlerts: Alert[] = []

  // 检查慢查询
  const slowQueryRules = alertRules.filter(rule => rule.type === 'slow_query' && rule.enabled)
  for (const rule of slowQueryRules) {
    const slowQueries = optimizer.getQueryLogs({
      minDuration: rule.threshold,
      limit: 10,
    })

    for (const query of slowQueries) {
      const existingAlert = alerts.find(
        a => a.ruleId === rule.id && a.details.queryId === query.id && !a.acknowledged
      )

      if (!existingAlert) {
        newAlerts.push({
          id: generateSecureId('alert'),
          ruleId: rule.id,
          type: rule.type,
          severity: rule.severity,
          message: `Slow query detected: ${query.query.substring(0, 100)}...`,
          details: {
            queryId: query.id,
            query: query.query,
            duration: query.duration,
            timestamp: query.timestamp,
          },
          timestamp: Date.now(),
          acknowledged: false,
        })
      }
    }
  }

  // 检查 N+1 查询
  const n1Rules = alertRules.filter(rule => rule.type === 'n1_query' && rule.enabled)
  for (const rule of n1Rules) {
    const n1Queries = optimizer.getQueryLogs({ isN1: true, limit: 10 })

    if (n1Queries.length >= rule.threshold) {
      const existingAlert = alerts.find(
        a => a.ruleId === rule.id && !a.acknowledged && Date.now() - a.timestamp < 60000
      )

      if (!existingAlert) {
        newAlerts.push({
          id: generateSecureId('alert'),
          ruleId: rule.id,
          type: rule.type,
          severity: rule.severity,
          message: `N+1 query pattern detected: ${n1Queries.length} similar queries`,
          details: {
            queryCount: n1Queries.length,
            queries: n1Queries.map(q => ({ id: q.id, query: q.query })),
          },
          timestamp: Date.now(),
          acknowledged: false,
        })
      }
    }
  }

  // 检查缓存命中率
  const cacheRules = alertRules.filter(rule => rule.type === 'low_cache_hit' && rule.enabled)
  for (const rule of cacheRules) {
    const stats = optimizer.getStats()

    if (stats.cacheHitRate < rule.threshold) {
      const existingAlert = alerts.find(
        a => a.ruleId === rule.id && !a.acknowledged && Date.now() - a.timestamp < 300000
      )

      if (!existingAlert) {
        newAlerts.push({
          id: generateSecureId('alert'),
          ruleId: rule.id,
          type: rule.type,
          severity: rule.severity,
          message: `Low cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`,
          details: {
            cacheHitRate: stats.cacheHitRate,
            totalQueries: stats.totalQueries,
            cachedQueries: stats.cachedQueries,
          },
          timestamp: Date.now(),
          acknowledged: false,
        })
      }
    }
  }

  // 添加新告警
  alerts.push(...newAlerts)

  // 清理旧告警（超过 24 小时）
  const now = Date.now()
  alerts = alerts.filter(alert => now - alert.timestamp < 24 * 60 * 60 * 1000)

  return newAlerts
}

/**
 * GET /api/performance/alerts
 *
 * 获取告警列表
 */
export async function GET(request: NextRequest) {
  try {
    initializeDefaultRules()

    const searchParams = request.nextUrl.searchParams
    const check = searchParams.get('check') === 'true'

    // 检查告警规则
    if (check) {
      const newAlerts = checkAlertRules()
      return NextResponse.json({
        success: true,
        data: {
          alerts: alerts,
          newAlerts,
          rules: alertRules,
        },
      })
    }

    // 获取告警列表
    const severity = searchParams.get('severity')
    const acknowledged = searchParams.get('acknowledged')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    let filteredAlerts = [...alerts]

    if (severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === severity)
    }

    if (acknowledged !== undefined) {
      filteredAlerts = filteredAlerts.filter(a => a.acknowledged === (acknowledged === 'true'))
    }

    filteredAlerts.sort((a, b) => b.timestamp - a.timestamp)

    if (limit) {
      filteredAlerts = filteredAlerts.slice(0, limit)
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts: filteredAlerts,
        rules: alertRules,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/performance/alerts
 *
 * 创建或更新告警规则
 */
export async function POST(request: NextRequest) {
  try {
    initializeDefaultRules()

    const body = await request.json()
    const { action, rule } = body

    if (action === 'create') {
      const newRule: AlertRule = {
        id: generateSecureId('rule'),
        name: rule.name,
        type: rule.type,
        enabled: rule.enabled ?? true,
        threshold: rule.threshold,
        severity: rule.severity,
        notificationChannels: rule.notificationChannels || ['log'],
      }

      alertRules.push(newRule)

      return NextResponse.json({
        success: true,
        data: newRule,
      })
    } else if (action === 'update') {
      const index = alertRules.findIndex(r => r.id === rule.id)

      if (index === -1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rule not found',
          },
          { status: 404 }
        )
      }

      alertRules[index] = { ...alertRules[index], ...rule }

      return NextResponse.json({
        success: true,
        data: alertRules[index],
      })
    } else if (action === 'acknowledge') {
      const { alertId } = body
      const alert = alerts.find(a => a.id === alertId)

      if (!alert) {
        return NextResponse.json(
          {
            success: false,
            error: 'Alert not found',
          },
          { status: 404 }
        )
      }

      alert.acknowledged = true

      return NextResponse.json({
        success: true,
        data: alert,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
      },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/performance/alerts
 *
 * 删除告警或规则
 */
export async function DELETE(request: NextRequest) {
  try {
    initializeDefaultRules()

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'alert'
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing id parameter',
        },
        { status: 400 }
      )
    }

    if (type === 'alert') {
      const index = alerts.findIndex(a => a.id === id)

      if (index === -1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Alert not found',
          },
          { status: 404 }
        )
      }

      alerts.splice(index, 1)

      return NextResponse.json({
        success: true,
        message: 'Alert deleted',
      })
    } else if (type === 'rule') {
      const index = alertRules.findIndex(r => r.id === id)

      if (index === -1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rule not found',
          },
          { status: 404 }
        )
      }

      alertRules.splice(index, 1)

      return NextResponse.json({
        success: true,
        message: 'Rule deleted',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid type',
      },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}