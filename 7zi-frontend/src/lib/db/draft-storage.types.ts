/**
 * IndexedDB 类型定义
 *
 * 为 IndexedDB 操作提供类型安全的接口定义
 */

import type { Draft, DraftType } from './draft-storage'

/**
 * IndexedDB 存储结构
 */
export interface DraftStoreSchema {
  keyPath: 'id'
  indexes: {
    type: DraftType
    createdAt: number
    expiresAt: number
  }
}

/**
 * 类型安全的 IndexedDB 存储接口
 */
export interface TypedObjectStore<T> {
  get(key: string): IDBRequest<T | undefined>
  put(value: T): IDBRequest<string>
  delete(key: string): IDBRequest<void>
  clear(): IDBRequest<void>
  openCursor(range?: IDBKeyRange): IDBRequest<IDBCursorWithValue | null>
}

/**
 * 类型安全的 IndexedDB 索引接口
 */
export interface TypedIndex<T> {
  openCursor(range: IDBKeyRange): IDBRequest<IDBCursorWithValue | null>
}

/**
 * 类型安全的 IndexedDB 事务接口
 */
export interface TypedTransaction {
  objectStore(name: string): IDBObjectStore
}

/**
 * 类型安全的 IndexedDB 数据库接口
 */
export interface TypedDatabase {
  transaction(storeNames: string[], mode: IDBTransactionMode): IDBTransaction
}

/**
 * 类型断言辅助函数
 * 用于验证从 IndexedDB 读取的数据是否符合预期类型
 */
export function assertDraft<T>(value: unknown): Draft<T> {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid draft: not an object')
  }

  const draft = value as Draft<T>

  if (typeof draft.id !== 'string') {
    throw new Error('Invalid draft: missing or invalid id')
  }

  if (typeof draft.type !== 'string') {
    throw new Error('Invalid draft: missing or invalid type')
  }

  if (typeof draft.createdAt !== 'number') {
    throw new Error('Invalid draft: missing or invalid createdAt')
  }

  if (typeof draft.updatedAt !== 'number') {
    throw new Error('Invalid draft: missing or invalid updatedAt')
  }

  if (typeof draft.expiresAt !== 'number') {
    throw new Error('Invalid draft: missing or invalid expiresAt')
  }

  return draft
}

/**
 * 安全的类型转换函数
 * 用于将 unknown 类型转换为指定类型，带运行时验证
 */
export function safeCast<T>(value: unknown, validator?: (v: unknown) => v is T): T {
  if (validator) {
    if (!validator(value)) {
      throw new Error(`Type assertion failed: value does not match expected type`)
    }
    return value
  }

  return value as T
}

/**
 * Draft 数据验证器
 */
export function isDraft<T>(value: unknown): value is Draft<T> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const draft = value as Draft<T>

  return (
    typeof draft.id === 'string' &&
    typeof draft.type === 'string' &&
    typeof draft.createdAt === 'number' &&
    typeof draft.updatedAt === 'number' &&
    typeof draft.expiresAt === 'number' &&
    'data' in draft
  )
}