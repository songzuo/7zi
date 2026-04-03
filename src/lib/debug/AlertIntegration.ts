/**
 * @fileoverview 告警系统集成
 * 将智能调试系统与监控告警系统集成
 * @version v1.10.0
 */

import type { DiagnosticReport, ErrorClassification, AnalysisContext } from './types'
import { DiagnosticEngine, diagnosticEngine } from './DiagnosticEngine'

// ============================================
// 类型定义
// ============================================

export interface AlertIntegration {
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  timestamp: string
  source: string
  metadata: Record<string, unknown>
  diagnostic?: DiagnosticReport
}

export interface AlertHandler {
  name: string
  handle(alert: AlertIntegration): Promise<void>
}

// ============================================
// 告警管理器
// ============================================

/**
 * 告警集成管理器
 */
export class AlertIntegrationManager {
  private handlers: AlertHandler[] = []
  private engine: DiagnosticEngine

  constructor(engine: DiagnosticEngine = diagnosticEngine) {
    this.engine = engine
  }

  /**
   * 注册告警处理器
   */
  registerHandler(handler: AlertHandler): void {
    this.handlers.push(handler)
  }

  /**
   * 从错误创建告警
   */
  async createAlertFromError(
    error: Error,
    source: string,
    context?: AnalysisContext
  ): Promise<AlertIntegration> {
    // 生成诊断报告
    const diagnostic = await this.engine.analyze(error, context)

    return {
      type: diagnostic.classification.severity === 'critical' ? 'error' : 'warning',
      title: `${diagnostic.classification.category.toUpperCase()}: ${diagnostic.error.name}`,
      message: diagnostic.error.message,
      severity: diagnostic.classification.severity,
      timestamp: diagnostic.timestamp,
      source,
      metadata: {
        category: diagnostic.classification.category,
        subtype: diagnostic.classification.subtype,
        confidence: diagnostic.classification.confidence,
        rootCauseType: diagnostic.rootCauseAnalysis.type,
        affectedComponents: diagnostic.rootCauseAnalysis.affectedComponents,
      },
      diagnostic,
    }
  }

  /**
   * 从诊断报告创建告警
   */
  createAlertFromDiagnostic(report: DiagnosticReport, source: string): AlertIntegration {
    return {
      type: report.classification.severity === 'critical' ? 'error' : 'warning',
      title: `${report.classification.category.toUpperCase()}: ${report.error.name}`,
      message: report.error.message,
      severity: report.classification.severity,
      timestamp: report.timestamp,
      source,
      metadata: {
        category: report.classification.category,
        subtype: report.classification.subtype,
        confidence: report.classification.confidence,
        rootCauseType: report.rootCauseAnalysis.type,
        affectedComponents: report.rootCauseAnalysis.affectedComponents,
      },
      diagnostic: report,
    }
  }

  /**
   * 触发告警
   */
  async triggerAlert(alert: AlertIntegration): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler.handle(alert)
      } catch (error) {
        console.error(`Alert handler ${handler.name} failed:`, error)
      }
    }
  }

  /**
   * 处理错误并触发告警
   */
  async handleError(
    error: Error,
    source: string,
    context?: AnalysisContext
  ): Promise<AlertIntegration> {
    const alert = await this.createAlertFromError(error, source, context)
    await this.triggerAlert(alert)
    return alert
  }
}

// ============================================
// 内置处理器
// ============================================

/**
 * 控制台告警处理器
 */
export const consoleAlertHandler: AlertHandler = {
  name: 'console',
  async handle(alert: AlertIntegration): Promise<void> {
    const emoji =
      alert.severity === 'critical'
        ? '🚨'
        : alert.severity === 'high'
          ? '❌'
          : alert.severity === 'medium'
            ? '⚠️'
            : 'ℹ️'

    console.group(`${emoji} ${alert.title}`)
    console.log('Severity:', alert.severity)
    console.log('Source:', alert.source)
    console.log('Message:', alert.message)
    console.log('Timestamp:', alert.timestamp)

    if (alert.diagnostic) {
      console.log('Root Cause:', alert.diagnostic.rootCauseAnalysis.description)
      console.log(
        'Fix Suggestions:',
        alert.diagnostic.fixSuggestions.map(s => s.title).join(', ')
      )
    }

    console.groupEnd()
  },
}

/**
 * Webhook 告警处理器
 */
export class WebhookAlertHandler implements AlertHandler {
  name = 'webhook'
  private url: string

  constructor(url: string) {
    this.url = url
  }

  async handle(alert: AlertIntegration): Promise<void> {
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      })
    } catch (error) {
      console.error('Failed to send alert to webhook:', error)
    }
  }
}

/**
 * Slack 告警处理器
 */
export class SlackAlertHandler implements AlertHandler {
  name = 'slack'
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async handle(alert: AlertIntegration): Promise<void> {
    const color =
      alert.severity === 'critical'
        ? '#FF0000'
        : alert.severity === 'high'
          ? '#FFA500'
          : alert.severity === 'medium'
            ? '#FFFF00'
            : '#00FF00'

    const payload = {
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Source', value: alert.source, short: true },
          ],
          footer: alert.timestamp,
        },
      ],
    }

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Failed to send alert to Slack:', error)
    }
  }
}

// ============================================
// 导出
// ============================================

export const alertIntegration = new AlertIntegrationManager()

export default {
  AlertIntegrationManager,
  alertIntegration,
  consoleAlertHandler,
  WebhookAlertHandler,
  SlackAlertHandler,
}