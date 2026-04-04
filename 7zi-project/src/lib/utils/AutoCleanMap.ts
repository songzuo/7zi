import { createLogger, LogLevel, Logger } from './logger';

// 创建日志实例
const logger = createLogger('AutoCleanMap', LogLevel.WARN);

/**
 * AutoCleanMap - 自动清理过期条目的 Map
 * 用于防止内存泄漏，自动移除长时间未访问的条目
 */

export interface AutoCleanMapOptions {
  /** 条目最大存活时间 (毫秒)，默认 5 分钟 */
  maxAge?: number;
  /** 清理检查间隔 (毫秒)，默认 1 分钟 */
  cleanupInterval?: number;
  /** 条目过期回调 */
  onExpire?: <K, V>(key: K, value: V) => void;
}

interface MapEntry<V> {
  value: V;
  lastAccess: number;
}

/**
 * 带 TTL 的 Map，自动清理过期条目
 * @example
 * const map = new AutoCleanMap<string, Operation>({ maxAge: 300000 });
 * map.set('op1', operation);
 * // 5 分钟后自动清理
 */
export class AutoCleanMap<K, V> extends Map<K, V> {
  private maxAge: number;
  private cleanupInterval: number;
  private onExpire?: (key: K, value: V) => void;
  private internalMap: Map<K, MapEntry<V>>;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private isCleaning: boolean = false;
  private log: Logger;

  constructor(options: AutoCleanMapOptions = {}) {
    super();
    this.maxAge = options.maxAge ?? 300000; // 默认 5 分钟
    this.cleanupInterval = options.cleanupInterval ?? 60000; // 默认 1 分钟
    this.onExpire = options.onExpire as (key: K, value: V) => void;
    this.internalMap = new Map();
    this.log = logger;
    this.startCleanupTimer();
  }

  /**
   * 设置键值对
   */
  set(key: K, value: V): this {
    this.internalMap.set(key, {
      value,
      lastAccess: Date.now(),
    });
    return this;
  }

  /**
   * 获取值并更新访问时间
   */
  get(key: K): V | undefined {
    const entry = this.internalMap.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.value;
    }
    return undefined;
  }

  /**
   * 检查键是否存在
   */
  has(key: K): boolean {
    return this.internalMap.has(key);
  }

  /**
   * 删除键
   */
  delete(key: K): boolean {
    return this.internalMap.delete(key);
  }

  /**
   * 清空所有条目
   */
  clear(): void {
    this.internalMap.clear();
  }

  /**
   * 获取条目数量
   */
  get size(): number {
    return this.internalMap.size;
  }

  /**
   * 遍历键
   */
  keys(): IterableIterator<K> {
    return this.internalMap.keys();
  }

  /**
   * 遍历值
   */
  values(): IterableIterator<V> {
    const values: V[] = [];
    for (const entry of this.internalMap.values()) {
      values.push(entry.value);
    }
    return values[Symbol.iterator]();
  }

  /**
   * 遍历条目
   */
  entries(): IterableIterator<[K, V]> {
    const entries: [K, V][] = [];
    for (const [key, entry] of this.internalMap.entries()) {
      entries.push([key, entry.value]);
    }
    return entries[Symbol.iterator]();
  }

  /**
   * forEach 遍历
   */
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void): void {
    for (const [key, entry] of this.internalMap.entries()) {
      callbackfn(entry.value, key, this);
    }
  }

  /**
   * 迭代器
   */
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  /**
   * 获取实例字符串标签
   */
  get [Symbol.toStringTag](): string {
    return 'AutoCleanMap';
  }

  /**
   * 启动定时清理
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // 防止定时器阻止进程退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * 清理过期条目
   */
  cleanup(): void {
    if (this.isCleaning) return;
    this.isCleaning = true;

    try {
      const now = Date.now();
      const keysToDelete: K[] = [];

      for (const [key, entry] of this.internalMap.entries()) {
        if (now - entry.lastAccess > this.maxAge) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        const entry = this.internalMap.get(key);
        if (entry) {
          this.internalMap.delete(key);
          if (this.onExpire) {
            try {
              this.onExpire(key, entry.value);
            } catch (error) {
              this.log.error('onExpire callback error:', error);
            }
          }
        }
      }
    } finally {
      this.isCleaning = false;
    }
  }

  /**
   * 停止清理定时器并清空所有条目
   * 在不再使用时调用，防止内存泄漏
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.internalMap.clear();
  }

  /**
   * 更新条目的访问时间（手动刷新 TTL）
   */
  touch(key: K): boolean {
    const entry = this.internalMap.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return true;
    }
    return false;
  }

  /**
   * 获取条目的剩余存活时间
   * @returns 剩余毫秒数，不存在返回 -1
   */
  getTTL(key: K): number {
    const entry = this.internalMap.get(key);
    if (!entry) return -1;
    const elapsed = Date.now() - entry.lastAccess;
    return Math.max(0, this.maxAge - elapsed);
  }
}

export default AutoCleanMap;
