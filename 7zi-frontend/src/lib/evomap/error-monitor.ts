/**
 * Error Monitor - Evomap Error Automation
 * 
 * 自动捕获错误并发布到 Evomap 协作进化市场
 * 
 * 自动化链路: 错误捕获 → Signal 生成 → publishFix
 */

import type { EvomapGateway } from './gateway'
import type { PublishResult } from './types'

/**
 * ErrorMonitor - 错误监控与自动发布
 * 
 * 使用方式:
 * ```typescript
 * const gateway = getEvomapGateway()
 * const monitor = new ErrorMonitor(gateway)
 * 
 * // 自动拦截全局错误
 * monitor.install()
 * 
 * // 或手动捕获特定错误
 * try {
 *   // your code
 * } catch (error) {
 *   await monitor.captureAndPublish(error as Error, { component: 'MyComponent' })
 * }
 * ```
 */
export class ErrorMonitor {
  private gateway: EvomapGateway
  private enabled: boolean = false

  // 全局错误处理器引用（用于卸载）
  private boundErrorHandler: ((event: ErrorEvent) => void) | null = null
  private boundRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null

  constructor(gateway: EvomapGateway) {
    this.gateway = gateway
  }

  // ==================== Signal 提取 ====================

  /**
   * 将错误转换为 signals
   * 
   * 提取规则:
   * - 错误名称作为 signal
   * - 错误消息关键词匹配
   * - 调用栈第一帧函数名
   */
  private extractSignals(error: Error): string[] {
    const signals: string[] = []

    // 1. 错误名称
    if (error.name) {
      signals.push(error.name.toLowerCase().replace(/\s+/g, '_'))
    }

    // 2. 错误消息关键词
    const msg = error.message.toLowerCase()
    
    if (msg.includes('null') || msg.includes('null')) {
      signals.push('null_pointer')
    }
    if (msg.includes('undefined')) {
      signals.push('undefined_access')
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      signals.push('timeout')
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
      signals.push('network_error')
    }
    if (msg.includes('async') || msg.includes('await')) {
      signals.push('async_error')
    }
    if (msg.includes('typeerror') || msg.includes('type error')) {
      signals.push('type_error')
    }
    if (msg.includes('syntaxerror') || msg.includes('syntax error')) {
      signals.push('syntax_error')
    }
    if (msg.includes('referenceerror') || msg.includes('reference error')) {
      signals.push('reference_error')
    }
    if (msg.includes('permission') || msg.includes('access')) {
      signals.push('permission_error')
    }
    if (msg.includes('validation') || msg.includes('invalid')) {
      signals.push('validation_error')
    }
    if (msg.includes('not found') || msg.includes('404')) {
      signals.push('not_found')
    }
    if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('403')) {
      signals.push('auth_error')
    }

    // 3. 调用栈第一帧
    if (error.stack) {
      const match = error.stack.match(/at\s+(.+?)\s+[\<(]/)
      if (match && match[1]) {
        const fnName = match[1].toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        if (fnName && fnName.length > 1 && fnName.length < 50) {
          signals.push(fnName)
        }
      }
    }

    // 去重并限制数量
    return [...new Set(signals)].slice(0, 5)
  }

  // ==================== 影响范围估算 ====================

  /**
   * 计算错误影响范围
   * 
   * 基于调用栈帧数估算
   */
  private estimateBlastRadius(error: Error): { files: number; lines: number } {
    if (error.stack) {
      const frames = error.stack.split('\n').filter(f => f.includes('at '))
      return {
        files: Math.min(frames.length, 5),
        lines: frames.length * 3,
      }
    }
    return { files: 1, lines: 5 }
  }

  // ==================== 核心方法 ====================

  /**
   * 捕获错误并发布到 Evomap
   * 
   * @param error - 要捕获的错误对象
   * @param context - 额外上下文信息
   * @returns PublishResult
   */
  async captureAndPublish(
    error: Error,
    context?: {
      component?: string
      userId?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<PublishResult> {
    const signals = this.extractSignals(error)
    
    const summary = `${error.name}: ${error.message.substring(0, 100)}`
    
    const content = [
      `Error: ${error.message}`,
      '',
      '--- Stack Trace ---',
      error.stack || 'No stack trace available',
      '',
      '--- Context ---',
      `Component: ${context?.component || 'Unknown'}`,
      `User ID: ${context?.userId || 'Anonymous'}`,
      context?.metadata ? `Metadata: ${JSON.stringify(context.metadata, null, 2)}` : '',
    ].filter(line => line !== undefined).join('\n')

    return this.gateway.publishFix({
      signals,
      summary,
      content,
      confidence: 0.7,
      blastRadius: this.estimateBlastRadius(error),
      intent: 'repair',
    })
  }

  /**
   * 安装全局错误拦截器
   * 
   * 拦截:
   * - window.onerror - 全局 JavaScript 错误
   * - unhandledrejection - 未处理的 Promise 拒绝
   */
  install(): void {
    if (typeof window === 'undefined') {
      console.warn('[ErrorMonitor] install() requires browser environment')
      return
    }

    if (this.enabled) {
      console.warn('[ErrorMonitor] Already installed')
      return
    }

    // 绑定处理器（保存引用以便后续卸载）
    this.boundErrorHandler = (event: ErrorEvent) => {
      // 忽略某些已知安全的错误
      if (event.message && event.message.includes('ResizeObserver')) {
        return
      }
      
      const error = new Error(event.message)
      error.name = 'GlobalError'
      error.stack = event.filename 
        ? `Error in ${event.filename}:${event.lineno}:${event.colno}\n${event.error?.stack || ''}`
        : event.error?.stack || ''
      
      // 异步执行以避免阻塞
      setTimeout(() => {
        this.captureAndPublish(error, {
          component: 'window.onerror',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            bubbles: event.bubbles,
          },
        }).catch(err => {
          console.error('[ErrorMonitor] Failed to publish error:', err)
        })
      }, 0)
    }

    this.boundRejectionHandler = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason))
      
      error.name = event.reason instanceof Error ? event.reason.name : 'UnhandledRejection'

      setTimeout(() => {
        this.captureAndPublish(error, {
          component: 'unhandledrejection',
          metadata: {
            type: event.type,
            reason: String(event.reason),
          },
        }).catch(err => {
          console.error('[ErrorMonitor] Failed to publish rejection:', err)
        })
      }, 0)
    }

    window.addEventListener('error', this.boundErrorHandler)
    window.addEventListener('unhandledrejection', this.boundRejectionHandler)
    
    this.enabled = true
    console.log('[ErrorMonitor] Installed global error handlers')
  }

  /**
   * 卸载全局错误拦截器
   */
  uninstall(): void {
    if (typeof window === 'undefined') return

    if (this.boundErrorHandler) {
      window.removeEventListener('error', this.boundErrorHandler)
      this.boundErrorHandler = null
    }

    if (this.boundRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.boundRejectionHandler)
      this.boundRejectionHandler = null
    }

    this.enabled = false
    console.log('[ErrorMonitor] Uninstalled global error handlers')
  }

  /**
   * 检查是否已安装
   */
  isInstalled(): boolean {
    return this.enabled
  }
}

// ==================== 便捷函数 ====================

let globalMonitor: ErrorMonitor | null = null

/**
 * 获取全局 ErrorMonitor 实例
 */
export function getGlobalErrorMonitor(): ErrorMonitor | null {
  return globalMonitor
}

/**
 * 创建并安装全局 ErrorMonitor
 */
export function createGlobalErrorMonitor(gateway: EvomapGateway): ErrorMonitor {
  if (globalMonitor) {
    console.warn('[ErrorMonitor] Global monitor already exists')
    return globalMonitor
  }
  
  globalMonitor = new ErrorMonitor(gateway)
  globalMonitor.install()
  return globalMonitor
}
