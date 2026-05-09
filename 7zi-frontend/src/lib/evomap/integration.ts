/**
 * Evomap Integration - Global Error Handling Setup
 * 
 * 提供全局错误拦截的便捷入口
 * 
 * 使用方式:
 * ```typescript
 * import { setupEvomapErrorHandling } from './integration'
 * 
 * // 在应用启动时调用
 * setupEvomapErrorHandling()
 * 
 * // 或者自定义配置
 * setupEvomapErrorHandling({
 *   gateway: customGateway,
 *   autoInstall: true,
 *   filters: [(error) => error.message.includes('ResizeObserver')],
 * })
 * ```
 */

import { getEvomapGateway, type EvomapGateway } from './gateway'
import { ErrorMonitor, createGlobalErrorMonitor } from './error-monitor'
import type { PublishResult } from './types'

export interface EvomapErrorHandlingConfig {
  /** 自定义 Gateway 实例（默认使用单例） */
  gateway?: EvomapGateway
  /** 是否自动安装全局处理器（默认 true） */
  autoInstall?: boolean
  /** 错误过滤器，返回 true 表示忽略该错误 */
  filters?: Array<(error: Error) => boolean>
  /** 自定义上下文 */
  context?: {
    component?: string
    userId?: string
    metadata?: Record<string, unknown>
  }
  /** 错误捕获后的回调 */
  onErrorCaptured?: (result: PublishResult, error: Error) => void
}

let integrationInstance: {
  monitor: ErrorMonitor
  gateway: EvomapGateway
  config: EvomapErrorHandlingConfig
} | null = null

/**
 * 设置 Evomap 全局错误处理
 * 
 * @param config - 配置选项
 * @returns 包含 monitor 和 gateway 的对象
 */
export function setupEvomapErrorHandling(
  config: EvomapErrorHandlingConfig = {}
): {
  monitor: ErrorMonitor
  gateway: EvomapGateway
} {
  // 获取或创建 Gateway
  const gateway = config.gateway || getEvomapGateway()
  
  // 创建 ErrorMonitor
  const monitor = new ErrorMonitor(gateway)
  
  // 保存实例
  integrationInstance = {
    monitor,
    gateway,
    config,
  }

  // 如果启用自动安装
  if (config.autoInstall !== false) {
    monitor.install()
  }

  console.log('[Evomap Integration] Error handling configured', {
    autoInstall: config.autoInstall !== false,
    filters: config.filters?.length || 0,
  })

  return { monitor, gateway }
}

/**
 * 获取当前集成实例
 */
export function getEvomapIntegration(): typeof integrationInstance {
  return integrationInstance
}

/**
 * 手动捕获并发布错误
 * 
 * @param error - 要捕获的错误
 * @param context - 额外上下文
 * @returns Promise<PublishResult>
 */
export async function captureError(
  error: Error,
  context?: {
    component?: string
    userId?: string
    metadata?: Record<string, unknown>
  }
): Promise<PublishResult | null> {
  if (!integrationInstance) {
    console.warn('[Evomap Integration] Not initialized. Call setupEvomapErrorHandling() first.')
    return null
  }

  const { monitor, config } = integrationInstance

  // 应用过滤器
  if (config.filters) {
    for (const filter of config.filters) {
      if (filter(error)) {
        console.log('[Evomap Integration] Error filtered:', error.message)
        return null
      }
    }
  }

  try {
    const result = await monitor.captureAndPublish(error, context)
    
    // 调用回调
    if (config.onErrorCaptured) {
      config.onErrorCaptured(result, error)
    }
    
    return result
  } catch (err) {
    console.error('[Evomap Integration] Failed to capture error:', err)
    return null
  }
}

/**
 * 卸载全局错误处理
 */
export function teardownEvomapErrorHandling(): void {
  if (integrationInstance) {
    integrationInstance.monitor.uninstall()
    integrationInstance = null
    console.log('[Evomap Integration] Error handling removed')
  }
}

// ==================== React Hook ====================

/**
 * useEvomapErrorMonitor - React Hook for Error Monitoring
 * 
 * ```tsx
 * import { useEvomapErrorMonitor } from './integration'
 * 
 * function App() {
 *   useEvomapErrorMonitor({
 *     filters: [(error) => error.message.includes('specific_noise')],
 *   })
 *   
 *   return <div>...</div>
 * }
 * ```
 */
export function useEvomapErrorMonitor(
  config: EvomapErrorHandlingConfig = {}
): void {
  // 注意：此 hook 仅处理客户端 hydration 后的错误
  if (typeof window === 'undefined') return

  // 在客户端挂载时设置
  if (!integrationInstance) {
    setupEvomapErrorHandling(config)
  }
}
