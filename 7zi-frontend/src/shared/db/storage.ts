/**
 * In-Memory Storage Utility
 *
 * 提供类似数据库的键值存储功能，支持 TTL、事务、查询等高级特性
 */

/**
 * 存储项接口
 */
export interface StorageItem<T = unknown> {
  value: T;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * 查询条件接口
 */
export interface QueryCondition<T = unknown> {
  key?: string | RegExp;
  value?: T | ((value: T) => boolean);
  expiresAt?: { before?: number; after?: number };
  createdAt?: { before?: number; after?: number };
  updatedAt?: { before?: number; after?: number };
}

/**
 * 存储选项接口
 */
export interface StorageOptions<T = unknown> {
  ttl?: number; // Time to live in milliseconds
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
}

/**
 * 事务操作接口
 */
export interface TransactionOperation {
  type: 'set' | 'delete' | 'clear';
  key?: string;
  value?: unknown;
}

/**
 * 统计信息接口
 */
export interface StorageStats {
  itemCount: number;
  expiredCount: number;
  totalSize: number;
  keys: string[];
}

/**
 * 内存存储类
 */
export class InMemoryStorage<T = unknown> {
  private store: Map<string, StorageItem<T>> = new Map();
  private options: StorageOptions<T> = {};

  constructor(options: StorageOptions<T> = {}) {
    this.options = {
      ttl: options.ttl,
      serializer: options.serializer,
      deserializer: options.deserializer,
    };
  }

  /**
   * 设置值
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = ttl || this.options.ttl ? now + (ttl || this.options.ttl!) : undefined;

    this.store.set(key, {
      value,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * 获取值
   */
  get(key: string): T | undefined {
    const item = this.store.get(key);

    if (!item) {
      return undefined;
    }

    // 检查是否过期
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 删除值
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * 清空所有值
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * 获取所有值
   */
  values(): T[] {
    return this.keys()
      .map(key => this.get(key))
      .filter((value): value is T => value !== undefined);
  }

  /**
   * 获取所有键值对
   */
  entries(): [string, T][] {
    return this.keys()
      .map(key => [key, this.get(key)] as [string, T | undefined])
      .filter((entry): entry is [string, T] => entry[1] !== undefined);
  }

  /**
   * 获取存储项数量
   */
  size(): number {
    // 过滤掉过期的项
    let count = 0;
    for (const item of this.store.values()) {
      if (!item.expiresAt || item.expiresAt > Date.now()) {
        count++;
      }
    }
    return count;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * 查询存储
   */
  query(condition: QueryCondition<T>): [string, T][] {
    const now = Date.now();
    const results: [string, T][] = [];

    for (const [key, item] of this.store.entries()) {
      // 跳过过期项
      if (item.expiresAt && item.expiresAt < now) {
        continue;
      }

      // 检查键条件
      if (condition.key) {
        if (condition.key instanceof RegExp) {
          if (!condition.key.test(key)) continue;
        } else if (key !== condition.key) {
          continue;
        }
      }

      // 检查值条件
      if (condition.value !== undefined) {
        if (typeof condition.value === 'function') {
          if (!(condition.value as (value: T) => boolean)(item.value)) continue;
        } else if (item.value !== condition.value) {
          continue;
        }
      }

      // 检查过期时间条件
      if (condition.expiresAt) {
        if (condition.expiresAt.before && (!item.expiresAt || item.expiresAt > condition.expiresAt.before)) {
          continue;
        }
        if (condition.expiresAt.after && (!item.expiresAt || item.expiresAt < condition.expiresAt.after)) {
          continue;
        }
      }

      // 检查创建时间条件
      if (condition.createdAt) {
        if (condition.createdAt.before && item.createdAt >= condition.createdAt.before) continue;
        if (condition.createdAt.after && item.createdAt <= condition.createdAt.after) continue;
      }

      // 检查更新时间条件
      if (condition.updatedAt) {
        if (condition.updatedAt.before && item.updatedAt >= condition.updatedAt.before) continue;
        if (condition.updatedAt.after && item.updatedAt <= condition.updatedAt.after) continue;
      }

      results.push([key, item.value]);
    }

    return results;
  }

  /**
   * 批量设置
   */
  setMany(items: Record<string, T>, ttl?: number): void {
    for (const [key, value] of Object.entries(items)) {
      this.set(key, value, ttl);
    }
  }

  /**
   * 批量获取
   */
  getMany(keys: string[]): Map<string, T> {
    const result = new Map<string, T>();
    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }
    return result;
  }

  /**
   * 批量删除
   */
  deleteMany(keys: string[]): number {
    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        count++;
      }
    }
    return count;
  }

  /**
   * 清理过期项
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取过期时间
   */
  getExpiresAt(key: string): number | undefined {
    const item = this.store.get(key);
    return item?.expiresAt;
  }

  /**
   * 检查是否过期
   */
  isExpired(key: string): boolean {
    const item = this.store.get(key);
    if (!item) {
      return true;
    }
    if (!item.expiresAt) {
      return false;
    }
    return item.expiresAt < Date.now();
  }

  /**
   * 延长过期时间
   */
  extendTTL(key: string, ttl: number): boolean {
    const item = this.store.get(key);
    if (!item) {
      return false;
    }

    item.expiresAt = Date.now() + ttl;
    return true;
  }

  /**
   * 执行事务
   */
  transaction(operations: TransactionOperation[]): boolean {
    const backup = new Map(this.store);

    try {
      for (const op of operations) {
        switch (op.type) {
          case 'set':
            if (op.key !== undefined && op.value !== undefined) {
              this.set(op.key, op.value as T);
            }
            break;
          case 'delete':
            if (op.key !== undefined) {
              this.delete(op.key);
            }
            break;
          case 'clear':
            this.clear();
            break;
        }
      }
      return true;
    } catch (error) {
      // 回滚
      this.store = backup;
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): StorageStats {
    const now = Date.now();
    let itemCount = 0;
    let expiredCount = 0;
    let totalSize = 0;
    const keys: string[] = [];

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        expiredCount++;
      } else {
        itemCount++;
        keys.push(key);
      }

      // 估算大小（简化版）
      totalSize += key.length + JSON.stringify(item.value).length;
    }

    return {
      itemCount,
      expiredCount,
      totalSize,
      keys,
    };
  }

  /**
   * 导出数据
   */
  export(): Record<string, { value: T; expiresAt?: number; createdAt: number; updatedAt: number }> {
    const result: Record<string, { value: T; expiresAt?: number; createdAt: number; updatedAt: number }> = {};

    for (const [key, item] of this.store.entries()) {
      result[key] = {
        value: item.value,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    }

    return result;
  }

  /**
   * 导入数据
   */
  import(data: Record<string, { value: T; expiresAt?: number; createdAt: number; updatedAt: number }>): void {
    this.clear();
    for (const [key, item] of Object.entries(data)) {
      this.store.set(key, item);
    }
  }
}

/**
 * 创建默认的存储实例
 */
export const storage = new InMemoryStorage();
