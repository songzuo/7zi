import { idGenerators } from './id-generator'
import { createLogger, LogLevel, Logger } from './logger'

// 创建日志实例
const logger = createLogger('ResourceManager', LogLevel.WARN)

/**
 * 可释放资源接口
 */
export interface Disposable {
  dispose(): void | Promise<void>
}

/**
 * 清理函数类型
 */
type CleanupFunction = () => void | Promise<void>

/**
 * 注册的资源项
 */
interface RegisteredResource {
  id: string
  cleanup: CleanupFunction
  type: 'disposable' | 'function'
  registeredAt: number
}

/**
 * 资源管理器选项
 */
export interface ResourceManagerOptions {
  /** 管理器名称，用于日志 */
  name?: string
  /** 是否在进程退出时自动清理 */
  cleanupOnExit?: boolean
}

/**
 * 资源管理器
 * 统一管理需要清理的资源，确保在 dispose 时全部清理
 *
 * @example
 * const manager = new ResourceManager({ name: 'WebSocket' });
 *
 * // 注册可释放对象
 * const subscription = manager.register(new Subscription());
 *
 * // 注册清理函数
 * manager.registerCleanup(() => clearInterval(timer));
 *
 * // 统一清理
 * await manager.dispose();
 */
export class ResourceManager {
  private resources: Map<string, RegisteredResource> = new Map()
  private name: string
  private disposed: boolean = false
  private exitHandler?: () => void
  private log: Logger

  constructor(options: ResourceManagerOptions = {}) {
    this.name = options.name ?? 'ResourceManager'
    this.log = logger.child(this.name)

    if (options.cleanupOnExit !== false) {
      this.setupExitHandler()
    }
  }

  /**
   * 注册一个可释放的资源
   * @param resource 实现了 Disposable 接口的对象
   * @returns 返回传入的资源，方便链式调用
   */
  register<T extends Disposable>(resource: T): T {
    if (this.disposed) {
      this.log.warn('已 disposed，无法注册新资源')
      return resource
    }

    const id = idGenerators.resource()
    this.resources.set(id, {
      id,
      cleanup: () => resource.dispose(),
      type: 'disposable',
      registeredAt: Date.now(),
    })

    return resource
  }

  /**
   * 注册一个清理函数
   * @param cleanup 清理函数
   * @returns 返回注销函数，调用可提前移除该清理
   */
  registerCleanup(cleanup: CleanupFunction): () => void {
    if (this.disposed) {
      this.log.warn('已 disposed，无法注册清理函数')
      return () => {}
    }

    const id = idGenerators.resource()
    this.resources.set(id, {
      id,
      cleanup,
      type: 'function',
      registeredAt: Date.now(),
    })

    // 返回注销函数
    return () => {
      this.resources.delete(id)
    }
  }

  /**
   * 注销一个资源
   * @param id 资源ID
   */
  unregister(id: string): boolean {
    return this.resources.delete(id)
  }

  /**
   * 清理所有注册的资源
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      this.log.warn('已经 disposed')
      return
    }

    this.disposed = true
    this.removeExitHandler()

    const cleanupPromises: Promise<void>[] = []
    const errors: Error[] = []

    // 按注册的逆序清理（后注册的先清理）
    const entries = Array.from(this.resources.entries()).reverse()

    for (const [id, resource] of entries) {
      try {
        const result = resource.cleanup()
        if (result instanceof Promise) {
          cleanupPromises.push(
            result.catch(error => {
              errors.push(error)
              this.log.error(`清理资源 ${id} 失败:`, error)
            })
          )
        }
      } catch (error) {
        errors.push(error as Error)
        this.log.error(`清理资源 ${id} 失败:`, error)
      }
    }

    // 等待所有异步清理完成
    await Promise.all(cleanupPromises)

    this.resources.clear()

    if (errors.length > 0) {
      this.log.warn(`清理完成，但有 ${errors.length} 个错误`)
    }
  }

  /**
   * 检查是否已 disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }

  /**
   * 获取注册的资源数量
   */
  get size(): number {
    return this.resources.size
  }

  /**
   * 获取所有资源ID
   */
  getResourceIds(): string[] {
    return Array.from(this.resources.keys())
  }

  /**
   * 设置进程退出处理器
   */
  private setupExitHandler(): void {
    this.exitHandler = () => {
      if (!this.disposed) {
        this.dispose().catch(error => {
          this.log.error('自动清理失败:', error)
        })
      }
    }

    process.on('beforeExit', this.exitHandler)
    process.on('SIGINT', this.exitHandler)
    process.on('SIGTERM', this.exitHandler)
  }

  /**
   * 移除进程退出处理器
   */
  private removeExitHandler(): void {
    if (this.exitHandler) {
      process.off('beforeExit', this.exitHandler)
      process.off('SIGINT', this.exitHandler)
      process.off('SIGTERM', this.exitHandler)
      this.exitHandler = undefined
    }
  }
}

export default ResourceManager
