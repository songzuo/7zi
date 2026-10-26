/**
 * Memory Storage Adapter for Rate Limiting Gateway
 * 
 * High-performance in-memory storage adapter for single-instance deployments.
 * Implements the IStorageAdapter interface.
 * 
 * @version 1.10.0
 */

import type { IStorageAdapter, StorageBackend, PipelineCommand } from '../types'

/**
 * Sorted set entry
 */
interface SortedSetEntry {
  score: number
  member: string
}

/**
 * 从 Lua 脚本里读出稳定标识。
 *
 * 算法模块在脚本头部写一行 `-- @script <name>`，
 * 这里用正则取出来。识别不出来的返回 undefined
 * —— 调用方必须拒绝执行，不能猜语义。
 */
function readScriptName(script: string): string | undefined {
  const match = /--\s*@script\s+([a-z0-9:\-]+)/i.exec(script)
  return match?.[1]
}

/**
 * Memory Storage Adapter
 * 
 * Provides in-memory storage for rate limiting data.
 * Suitable for single-instance deployments or as a fallback.
 */
export class MemoryAdapter implements IStorageAdapter {
  private store = new Map<string, string>()
  private sortedSets = new Map<string, SortedSetEntry[]>()
  private expirations = new Map<string, number>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(cleanupIntervalMs = 60000) {
    // Start cleanup interval
    if (cleanupIntervalMs > 0) {
      this.cleanupInterval = setInterval(() => this.cleanupExpired(), cleanupIntervalMs)
    }
  }

  /**
   * Get a value from memory
   */
  async get(key: string): Promise<string | null> {
    this.checkExpiration(key)
    return this.store.get(key) ?? null
  }

  /**
   * Set a value in memory with optional TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.store.set(key, value)
    
    if (ttl) {
      this.expirations.set(key, Date.now() + ttl * 1000)
    } else {
      this.expirations.delete(key)
    }
  }

  /**
   * Delete a key from memory
   */
  async delete(key: string): Promise<boolean> {
    const existed = this.store.has(key)
    this.store.delete(key)
    this.expirations.delete(key)
    this.sortedSets.delete(key)
    return existed
  }

  /**
   * Increment a value in memory
   */
  async increment(key: string): Promise<number> {
    const current = parseInt(this.store.get(key) ?? '0', 10)
    const newValue = current + 1
    this.store.set(key, newValue.toString())
    return newValue
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    let set = this.sortedSets.get(key)
    
    if (!set) {
      set = []
      this.sortedSets.set(key, set)
    }

    // Check if member already exists
    const existingIndex = set.findIndex(e => e.member === member)
    
    if (existingIndex >= 0) {
      set[existingIndex].score = score
      return 0 // Updated, not added
    }

    // Add new entry
    set.push({ score, member })
    
    // Sort by score
    set.sort((a, b) => a.score - b.score)
    
    return 1 // Added
  }

  /**
   * Remove from sorted set by score range
   */
  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const set = this.sortedSets.get(key)
    
    if (!set) {
      return 0
    }

    const originalLength = set.length
    
    // Filter out entries outside the range
    const filtered = set.filter(e => e.score < min || e.score > max)
    this.sortedSets.set(key, filtered)
    
    return originalLength - filtered.length
  }

  /**
   * Get sorted set cardinality
   */
  async zcard(key: string): Promise<number> {
    const set = this.sortedSets.get(key)
    return set?.length ?? 0
  }

  /**
   * Get sorted set range
   */
  async zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    const set = this.sortedSets.get(key)
    
    if (!set || set.length === 0) {
      return []
    }

    // Handle negative indices
    let startIndex = start < 0 ? set.length + start : start
    let stopIndex = stop < 0 ? set.length + stop : stop

    // Clamp indices
    startIndex = Math.max(0, startIndex)
    stopIndex = Math.min(set.length - 1, stopIndex)

    if (startIndex > stopIndex) {
      return []
    }

    const entries = set.slice(startIndex, stopIndex + 1)
    
    if (withScores) {
      const result: string[] = []
      for (const entry of entries) {
        result.push(entry.member)
        result.push(entry.score.toString())
      }
      return result
    }
    
    return entries.map(e => e.member)
  }

  /**
   * Execute Lua script.
   *
   * 内存适配器没有 Lua 引擎，但速率限制算法（TokenBucket / SlidingWindow）
   * 是**按 storage 接口**写的，只认 eval()。
   * 而生产代码里 `new TokenBucket(storage)` 用的正是 MemoryAdapter
   * （middleware/multi-layer.ts:107、api/management.ts:48）——
   * 也就是说这条路径以前**直接抛 StorageError**，限流功能完全不可用。
   *
   * 这里对**已知脚本**用等价的 JS 实现复刻其语义。
   * 脚本靠 `-- @script <name>` 注释里的稳定标识来识别
   * （标识由算法模块统一定义，两边不会漂移）；
   * 识别不出来的脚本仍然抛错 —— 不能猜语义。
   */
  async eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    const name = readScriptName(script)

    switch (name) {
      case 'token-bucket:check':
        return this.runTokenBucketCheck(keys[0], args)
      case 'token-bucket:consume':
        return this.runTokenBucketConsume(keys[0], args)
      case 'token-bucket:add-tokens':
        return this.runTokenBucketAddTokens(keys[0], args)
      case 'sliding-window:check':
        return this.runSlidingWindowCheck(keys[0], args)
      case 'sliding-window:status':
        return this.runSlidingWindowStatus(keys[0], args)
      default:
        throw new Error(
          `Memory adapter cannot execute script${name ? ` '${name}'` : ''}: ` +
            'unknown or unsupported Lua script. Use algorithm classes directly.'
        )
    }
  }

  /**
   * 等价于 TOKEN_BUCKET_LUA：检查并消耗 1 个令牌。
   * 返回 [allowed, tokens, resetTime]。
   */
  private runTokenBucketCheck(
    key: string,
    args: (string | number)[]
  ): [number, number, number] {
    const now = Number(args[0])
    const capacity = Number(args[1])
    const refillRate = Number(args[2])
    const ttl = Number(args[3])

    const state = this.readHash(key)
    let tokens = state.tokens
    let lastRefill = state.lastRefill
    let storedCapacity = state.capacity

    if (tokens === undefined || lastRefill === undefined) {
      // 首次请求
      tokens = capacity
      lastRefill = now
      storedCapacity = capacity
    } else if (storedCapacity !== undefined && storedCapacity !== capacity && storedCapacity > 0) {
      // 容量变了，按比例缩放
      tokens = Math.min(capacity, (tokens * capacity) / storedCapacity)
      storedCapacity = capacity
    }

    // 按经过时间补充令牌
    const elapsed = (now - lastRefill) / 1000
    if (elapsed > 0) {
      tokens = Math.min(capacity, tokens + elapsed * refillRate)
      lastRefill = now
    }

    let allowed = false
    if (tokens >= 1) {
      tokens -= 1
      allowed = true
    }

    let resetTime = now
    if (tokens < 1) {
      const timeToNextToken = (1 - tokens) / refillRate
      resetTime = now + Math.ceil(timeToNextToken * 1000)
    }

    this.writeHash(key, { tokens, lastRefill, capacity: storedCapacity }, ttl)

    return [allowed ? 1 : 0, tokens, resetTime]
  }

  /**
   * 等价于 CONSUME_TOKENS_LUA：批量消耗令牌。
   * 返回 [allowed, tokens, resetTime]。
   */
  private runTokenBucketConsume(
    key: string,
    args: (string | number)[]
  ): [number, number, number] {
    const tokensToConsume = Number(args[0])
    const now = Number(args[1])
    const capacity = Number(args[2])
    const refillRate = Number(args[3])
    const ttl = Number(args[4])

    const state = this.readHash(key)
    let tokens = state.tokens ?? capacity
    let lastRefill = state.lastRefill ?? now

    const elapsed = (now - lastRefill) / 1000
    if (elapsed > 0) {
      tokens = Math.min(capacity, tokens + elapsed * refillRate)
      lastRefill = now
    }

    let allowed = false
    if (tokens >= tokensToConsume) {
      tokens -= tokensToConsume
      allowed = true
    }

    let resetTime = now
    if (tokens < 1) {
      const timeToNextToken = (1 - tokens) / refillRate
      resetTime = now + Math.ceil(timeToNextToken * 1000)
    }

    this.writeHash(key, { tokens, lastRefill }, ttl)

    return [allowed ? 1 : 0, tokens, resetTime]
  }

  /**
   * 等价于 token-bucket.ts 里动态生成的 addTokens 脚本。
   * 返回补充后的令牌数。
   */
  private runTokenBucketAddTokens(key: string, args: (string | number)[]): number {
    const tokensToAdd = Number(args[0])
    const maxCapacity = Number(args[1])

    const state = this.readHash(key)
    const now = Date.now()
    const tokens = state.tokens ?? 0
    const newTokens = Math.min(maxCapacity, tokens + tokensToAdd)

    this.writeHash(key, { tokens: newTokens, lastRefill: state.lastRefill ?? now }, 0)

    return newTokens
  }

  /**
   * 等价于 SLIDING_WINDOW_LUA：滑动窗口计数。
   * 返回 [allowed, count, resetTime]。
   */
  private runSlidingWindowCheck(
    key: string,
    args: (string | number)[]
  ): [number, number, number] {
    const now = Number(args[0])
    const windowMs = Number(args[1])
    const limit = Number(args[2])
    const ttl = Number(args[3])

    const cutoff = now - windowMs
    const entries = this.readSortedSet(key).filter(e => e.score > cutoff)

    const count = entries.length
    let allowed = false
    if (count < limit) {
      allowed = true
      entries.push({ score: now, member: String(now) })
    }

    this.writeSortedSet(key, entries, ttl)

    let resetTime = now
    if (!allowed && entries.length > 0) {
      const oldest = entries.reduce((min, e) => (e.score < min ? e.score : min), Infinity)
      resetTime = oldest + windowMs
    } else if (allowed && entries.length > 0) {
      const oldest = entries.reduce((min, e) => (e.score < min ? e.score : min), Infinity)
      resetTime = oldest + windowMs
    }

    return [allowed ? 1 : 0, count, resetTime]
  }

  /**
   * 等价于 SLIDING_WINDOW_STATUS_LUA：返回 [count, resetTime]。
   */
  private runSlidingWindowStatus(key: string, args: (string | number)[]): [number, number] {
    const now = Number(args[0])
    const windowMs = Number(args[1])

    const cutoff = now - windowMs
    const entries = this.readSortedSet(key).filter(e => e.score > cutoff)
    const count = entries.length

    let resetTime = now
    if (entries.length > 0) {
      const oldest = entries.reduce((min, e) => (e.score < min ? e.score : min), Infinity)
      resetTime = oldest + windowMs
    }

    return [count, resetTime]
  }

  /**
   * 读取哈希字段（等价于 Redis HMGET）。
   */
  private readHash(key: string): { tokens?: number; lastRefill?: number; capacity?: number } {
    const raw = this.store.get(key)
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw) as Record<string, number>
      return {
        tokens: parsed.tokens,
        lastRefill: parsed.lastRefill,
        capacity: parsed.capacity,
      }
    } catch {
      return {}
    }
  }

  /**
   * 写入哈希字段（等价于 Redis HMSET + EXPIRE）。
   */
  private writeHash(
    key: string,
    fields: { tokens: number; lastRefill: number; capacity?: number },
    ttl: number
  ): void {
    this.store.set(key, JSON.stringify(fields))
    if (ttl > 0) {
      this.expirations.set(key, Date.now() + ttl * 1000)
    }
  }

  /**
   * 读取有序集合（等价于 Redis ZRANGEBYSCORE）。
   */
  private readSortedSet(key: string): SortedSetEntry[] {
    return this.sortedSets.get(key) ?? []
  }

  /**
   * 写入有序集合（等价于 Redis ZADD + EXPIRE）。
   */
  private writeSortedSet(key: string, entries: SortedSetEntry[], ttl: number): void {
    this.sortedSets.set(key, entries)
    if (ttl > 0) {
      this.expirations.set(key, Date.now() + ttl * 1000)
    }
  }

  /**
   * HGET —— 读取哈希里的单个字段（Redis 兼容）。
   *
   * TokenBucket.getState() / reset() 走的是 pipeline + HGET/HSET，
   * 而 pipeline 是靠 `this[command]` 找方法的 ——
   * 之前没有 HGET/HSET 方法，pipeline 里找不到就直接返回 undefined，
   * 于是 getState 永远返回 null、reset 什么都不做。
   */
  async hget(key: string, field: string): Promise<string | null> {
    const raw = this.store.get(key)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Record<string, number>
      const value = parsed[field]
      return value === undefined ? null : String(value)
    } catch {
      return null
    }
  }

  /**
   * HSET —— 写入哈希里的单个字段（Redis 兼容）。
   */
  async hset(key: string, field: string, value: string | number): Promise<number> {
    let parsed: Record<string, number> = {}
    const raw = this.store.get(key)
    if (raw) {
      try {
        parsed = JSON.parse(raw) as Record<string, number>
      } catch {
        parsed = {}
      }
    }
    const existed = parsed[field] !== undefined
    parsed[field] = typeof value === 'number' ? value : Number(value)
    this.store.set(key, JSON.stringify(parsed))
    return existed ? 0 : 1
  }

  /**
   * Execute pipeline commands
   */
  async pipeline(commands: PipelineCommand[]): Promise<unknown[]> {
    const results: unknown[] = []

    for (const { command, args } of commands) {
      // 命令名大小写不敏感 —— Redis 的命令都是大写（HGET/HSET），
      // 而内存实现的方法名是小写（hget/hset）。
      // 之前直接 `this[command]` 拿的是 undefined，
      // 于是 pipeline 里的 HGET/HSET 静默返回 undefined。
      const method =
        (this as Record<string, unknown>)[command] ??
        (this as Record<string, unknown>)[String(command).toLowerCase()]
      if (typeof method === 'function') {
        // 必须用 .call(this, ...) 绑定 —— 直接把方法摘出来调用的话
        // 里面的 `this.store` 是 undefined（this 指向 undefined）。
        const result = await (method as (...a: unknown[]) => unknown).call(this, ...args)
        results.push(result)
      }
    }

    return results
  }

  /**
   * Check if adapter is connected (always true for memory)
   */
  async isConnected(): Promise<boolean> {
    return true
  }

  /**
   * Get storage type
   */
  getType(): StorageBackend {
    return 'memory'
  }

  /**
   * Check if key is expired
   */
  private checkExpiration(key: string): void {
    const expiration = this.expirations.get(key)
    
    if (expiration && Date.now() > expiration) {
      this.store.delete(key)
      this.expirations.delete(key)
      this.sortedSets.delete(key)
    }
  }

  /**
   * Clean up expired keys
   */
  private cleanupExpired(): void {
    const now = Date.now()
    
    for (const [key, expiration] of Array.from(this.expirations.entries())) {
      if (now > expiration) {
        this.store.delete(key)
        this.expirations.delete(key)
        this.sortedSets.delete(key)
      }
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.store.clear()
    this.sortedSets.clear()
    this.expirations.clear()
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    keys: number
    sortedSets: number
    expirations: number
    memoryUsage: number
  } {
    let memoryUsage = 0
    
    // Estimate memory usage
    for (const [key, value] of Array.from(this.store.entries())) {
      memoryUsage += key.length + value.length
    }
    
    for (const [key, entries] of Array.from(this.sortedSets.entries())) {
      memoryUsage += key.length
      for (const entry of entries) {
        memoryUsage += entry.member.length + 16 // score + member
      }
    }

    return {
      keys: this.store.size,
      sortedSets: this.sortedSets.size,
      expirations: this.expirations.size,
      memoryUsage
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

/**
 * Create a singleton memory adapter
 */
let memoryAdapterInstance: MemoryAdapter | null = null

export function getMemoryAdapter(cleanupIntervalMs?: number): MemoryAdapter {
  if (!memoryAdapterInstance) {
    memoryAdapterInstance = new MemoryAdapter(cleanupIntervalMs)
  }
  return memoryAdapterInstance
}

export default MemoryAdapter
