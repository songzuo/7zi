/**
 * utils - 统一的工具库导出
 */

// ID 生成器
export {
  generateId,
  idGenerators,
  generateShortId,
  createNamespacedIdGenerator,
} from './id-generator'

// Logger
export {
  Logger,
  createLogger,
  createLoggerWithGlobalLevel,
  setGlobalLogLevel,
  getGlobalLogLevel,
  LogLevel,
} from './logger'

// 资源管理器
export { ResourceManager, Disposable, type ResourceManagerOptions } from './ResourceManager'

// 自动清理 Map
export { AutoCleanMap } from './AutoCleanMap'

// 类型
export type { AutoCleanMapOptions } from './AutoCleanMap'
