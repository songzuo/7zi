/**
 * WebSocket 消息重试管理器
 * 提供指数退避策略的消息重试机制
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface RetryOptions {
  /** 最大重试次数 (默认: 3) */
  maxRetries?: number;
  /** 初始延迟时间 (毫秒, 默认: 1000) */
  initialDelay?: number;
  /** 最大延迟时间 (毫秒, 默认: 30000) */
  maxDelay?: number;
  /** 退避因子 (默认: 2) */
  backoffFactor?: number;
  /** 重试回调 */
  onRetry?: (attempt: number, error: Error) => void;
  /** 成功回调 */
  onSuccess?: () => void;
  /** 失败回调 */
  onFailure?: (error: Error) => void;
}

export interface RetryState {
  /** 当前重试次数 */
  attempts: number;
  /** 最后一次错误 */
  lastError: Error | null;
  /** 下一次重试时间戳 */
  nextRetryTime: number | null;
  /** 是否正在重试 */
  isRetrying: boolean;
}

export interface RetryEntry<T = unknown> {
  /** 消息ID */
  id: string;
  /** 要执行的操作 */
  action: () => Promise<T>;
  /** 重试选项 */
  options: RetryOptions;
  /** 重试状态 */
  state: RetryState;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
}

// ============================================================================
// 重试管理器类
// ============================================================================

/**
 * 单个重试任务的内部实现
 */
export class RetryTask<T = unknown> {
  private options: Required<RetryOptions>;
  private state: RetryState;
  private timer: NodeJS.Timeout | null = null;
  private sleepResolve: (() => void) | null = null;
  private sleepReject: ((error: Error) => void) | null = null;
  private cancelled: boolean = false;
  private cancelError: Error | null = null;
  private isSleeping: boolean = false;

  constructor(options: RetryOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      initialDelay: options.initialDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30000,
      backoffFactor: options.backoffFactor ?? 2,
      onRetry: options.onRetry ?? (() => {}),
      onSuccess: options.onSuccess ?? (() => {}),
      onFailure: options.onFailure ?? (() => {}),
    };

    this.state = {
      attempts: 0,
      lastError: null,
      nextRetryTime: null,
      isRetrying: false,
    };
  }

  /**
   * 执行重试任务
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    this.cancelled = false;
    this.state.isRetrying = true;
    this.state.attempts = 0;
    this.state.lastError = null;

    try {
      const result = await this.executeWithRetry(fn);
      this.state.isRetrying = false;
      this.options.onSuccess();
      return result;
    } catch (_error) {
      this.state.isRetrying = false;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.options.onFailure(errorObj);
      throw errorObj;
    }
  }

  /**
   * 带重试的执行逻辑
   */
  private async executeWithRetry(fn: () => Promise<T>): Promise<T> {
    if (this.cancelled) {
      throw new Error('Task cancelled');
    }

    try {
      const result = await fn();
      // Check if cancelled during action execution
      if (this.cancelled) {
        throw new Error('Task cancelled');
      }
      this.reset();
      return result;
    } catch (_error) {
      if (this.cancelled) {
        throw new Error('Task cancelled');
      }

      this.state.lastError = error instanceof Error ? error : new Error(String(error));
      this.state.attempts++;

      // 触发重试回调
      this.options.onRetry(this.state.attempts, this.state.lastError);

      if (this.state.attempts <= this.options.maxRetries) {
        const delay = this.calculateDelay(this.state.attempts);
        this.state.nextRetryTime = Date.now() + delay;
        await this.sleep(delay);
        return this.executeWithRetry(fn);
      } else {
        throw this.state.lastError;
      }
    }
  }

  /**
   * 计算退避延迟时间 (指数退避)
   */
  private calculateDelay(attempt: number): number {
    const delay = this.options.initialDelay * Math.pow(this.options.backoffFactor, attempt - 1);
    return Math.min(delay, this.options.maxDelay);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isSleeping = true;
      this.sleepResolve = resolve;
      this.sleepReject = reject;
      this.timer = setTimeout(() => {
        if (this.cancelled) {
          reject(this.cancelError || new Error('Task cancelled'));
        } else {
          resolve();
        }
        this.isSleeping = false;
        this.sleepResolve = null;
        this.sleepReject = null;
      }, ms);
    });
  }

  /**
   * 获取当前状态
   */
  getState(): RetryState {
    return { ...this.state };
  }

  /**
   * 重置状态
   */
  reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state = {
      attempts: 0,
      lastError: null,
      nextRetryTime: null,
      isRetrying: false,
    };
  }

  /**
   * 取消重试
   */
  cancel(): void {
    // Clear timeout and reject sleep if pending
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      // Only reject if there's actually a pending sleep
      if (this.isSleeping && this.sleepReject) {
        this.sleepReject(new Error('Task cancelled'));
        this.sleepResolve = null;
        this.sleepReject = null;
        this.isSleeping = false;
      }
    }
    // Always clear the resolve/reject refs
    this.sleepResolve = null;
    this.sleepReject = null;
    this.cancelled = true;
    this.state.isRetrying = false;
    this.state.nextRetryTime = null;
  }

  /**
   * Check if task is cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }
}

/**
 * 全局重试管理器
 * 管理多个重试任务
 */
export class RetryManager {
  private tasks: Map<string, RetryTask<unknown>> = new Map();
  private taskMetadata: Map<string, RetryEntry<unknown>> = new Map();
  private activeTasks: Set<string> = new Set();
  private maxConcurrentTasks: number = 10;

  constructor(options?: { maxConcurrentTasks?: number }) {
    if (options?.maxConcurrentTasks) {
      this.maxConcurrentTasks = options.maxConcurrentTasks;
    }
  }

  /**
   * 执行带重试的任务
   * @param id 任务ID
   * @param action 要执行的异步操作
   * @param options 重试选项
   */
  async execute<T>(
    id: string,
    action: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    // 如果任务已存在，先取消它
    if (this.tasks.has(id)) {
      this.cancel(id);
    }

    const task = new RetryTask<T>(options);
    this.tasks.set(id, task as RetryTask<unknown>);
    this.activeTasks.add(id);

    const entry: RetryEntry<T> = {
      id,
      action,
      options,
      state: task.getState(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.taskMetadata.set(id, entry);

    try {
      const result = await task.execute(action);
      return result;
    } catch (_error) {
      throw error;
    } finally {
      this.activeTasks.delete(id);
    }
  }

  /**
   * 获取任务状态
   */
  getState(id: string): RetryState | null {
    const task = this.tasks.get(id);
    return task ? task.getState() : null;
  }

  /**
   * 获取所有任务状态
   */
  getAllStates(): Map<string, RetryState> {
    const states = new Map<string, RetryState>();
    this.tasks.forEach((task, id) => {
      states.set(id, task.getState());
    });
    return states;
  }

  /**
   * 获取任务元数据
   */
  getEntry(id: string): RetryEntry | undefined {
    const entry = this.taskMetadata.get(id);
    if (entry) {
      return {
        ...entry,
        state: this.getState(id)!,
      };
    }
    return undefined;
  }

  /**
   * 获取所有任务元数据
   */
  getAllEntries(): RetryEntry[] {
    const entries: RetryEntry[] = [];
    this.taskMetadata.forEach((entry, id) => {
      entries.push({
        ...entry,
        state: this.getState(id)!,
      });
    });
    return entries;
  }

  /**
   * 取消任务
   */
  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (task) {
      task.cancel();
      this.tasks.delete(id);
      this.taskMetadata.delete(id);
      return true;
    }
    return false;
  }

  /**
   * 取消所有任务
   */
  cancelAll(): void {
    this.tasks.forEach((task) => task.cancel());
    this.tasks.clear();
    this.taskMetadata.clear();
    this.activeTasks.clear();
  }

  /**
   * 重置任务状态
   */
  reset(id: string): boolean {
    const task = this.tasks.get(id);
    if (task) {
      task.reset();
      return true;
    }
    return false;
  }

  /**
   * 获取活跃任务数量
   */
  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  /**
   * 清理已完成的任务
   */
  private cleanup(id: string): void {
    this.tasks.delete(id);
    this.taskMetadata.delete(id);
  }

  /**
   * 清理所有已完成任务
   */
  clearCompleted(): void {
    const toDelete: string[] = [];
    this.tasks.forEach((task, id) => {
      const state = task.getState();
      if (!state.isRetrying && state.lastError === null) {
        toDelete.push(id);
      }
    });
    toDelete.forEach((id) => this.cleanup(id));
  }
}

// ============================================================================
// 默认实例
// ============================================================================

/**
 * 全局默认重试管理器实例
 */
export const retryManager = new RetryManager();

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建一个简单的重试包装器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const task = new RetryTask<T>(options);
  return task.execute(fn);
}

/**
 * 计算指数退避延迟
 */
export function calculateBackoffDelay(
  attempt: number,
  options: {
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): number {
  const {
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
  } = options;

  const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
  return Math.min(delay, maxDelay);
}
