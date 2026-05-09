/**
 * Evomap Gateway - 导出入口
 */

export * from './types'
export * from './gateway'
export { useEvomap, type UseEvomapOptions, type UseEvomapReturn } from './use-evomap'

// Error Monitor exports
export {
  ErrorMonitor,
  getGlobalErrorMonitor,
  createGlobalErrorMonitor,
} from './error-monitor'

// Integration exports
export {
  setupEvomapErrorHandling,
  getEvomapIntegration,
  captureError,
  teardownEvomapErrorHandling,
  useEvomapErrorMonitor,
  type EvomapErrorHandlingConfig,
} from './integration'
