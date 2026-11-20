/**
 * 语义缓存
 * 缓存相似请求的结果，相似度阈值 95%
 */

import { CacheEntry } from './types'

/**
 * 缓存配置
 */
interface SemanticCacheConfig {
  maxSize: number // 最大缓存条目数
  ttlMs: number // 缓存过期时间 (毫秒)
  similarityThreshold: number // 相似度阈值 (0-1)
  enableStats: boolean // 是否启用统计
}

const DEFAULT_CONFIG: SemanticCacheConfig = {
  maxSize: 1000,
  ttlMs: 3600000, // 1 小时
  similarityThreshold: 0.95,
  enableStats: true,
}

/**
 * 缓存统计
 */
interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
}

/**
 * 语义缓存类
 */
export class SemanticCache {
  private cache: Map<string, CacheEntry>
  private config: SemanticCacheConfig
  private stats: CacheStats
  private accessOrder: string[] // LRU 顺序

  constructor(config: Partial<SemanticCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.cache = new Map()
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
    }
    this.accessOrder = []
  }

  /**
   * 生成请求哈希
   * 使用简单的字符串哈希算法
   */
  private hashRequest(request: string): string {
    let hash = 0
    for (let i = 0; i < request.length; i++) {
      const char = request.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * 计算文本相似度 (Jaccard 相似度)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // 简化版 Jaccard 相似度
    // 将文本分词并计算交集/并集比
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter((x) => words2.has(x)))
    const union = new Set([...words1, ...words2])

    if (union.size === 0) return 1.0
    return intersection.size / union.size
  }

  /**
   * 计算更精确的相似度 (用于高精度匹配)
   */
  private calculateAdvancedSimilarity(text1: string, text2: string): number {
    // 1. Jaccard 相似度
    const jaccard = this.calculateSimilarity(text1, text2)

    // 2. 长度相似度
    const len1 = text1.length
    const len2 = text2.length
    const lengthSimilarity = Math.min(len1, len2) / Math.max(len1, len2)

    // 3. 首尾匹配
    const prefixMatch = text1.slice(0, 50) === text2.slice(0, 50) ? 1 : 0
    const suffixMatch = text1.slice(-50) === text2.slice(-50) ? 1 : 0

    // 加权平均
    return jaccard * 0.5 + lengthSimilarity * 0.3 + (prefixMatch + suffixMatch) * 0.1
  }

  /**
   * 查找相似缓存条目
   */
  private findSimilarEntry(request: string): CacheEntry | null {
    const requestHash = this.hashRequest(request)

    // 1. 精确匹配
    const exactMatch = this.cache.get(requestHash)
    if (exactMatch && Date.now() < exactMatch.expiresAt) {
      return exactMatch
    }

    // 2. 相似度匹配
    let bestMatch: CacheEntry | null = null
    let bestSimilarity = 0

    for (const entry of this.cache.values()) {
      // 检查是否过期
      if (Date.now() >= entry.expiresAt) {
        continue
      }

      // 计算相似度
      const similarity = this.calculateAdvancedSimilarity(
        request,
        entry.requestHash
      )

      if (
        similarity >= this.config.similarityThreshold &&
        similarity > bestSimilarity
      ) {
        bestSimilarity = similarity
        bestMatch = entry
      }
    }

    return bestMatch
  }

  /**
   * 获取缓存
   */
  get(request: string): unknown | null {
    const entry = this.findSimilarEntry(request)

    if (entry) {
      // 更新 LRU
      this.updateAccessOrder(entry.requestHash)
      this.stats.hits++
      return entry.response
    }

    this.stats.misses++
    return null
  }

  /**
   * 设置缓存
   */
  set(request: string, response: unknown, tokens: number = 0): void {
    // 检查是否需要淘汰
    if (this.cache.size >= this.config.maxSize) {
      this.evict()
    }

    const requestHash = this.hashRequest(request)
    const now = Date.now()

    const entry: CacheEntry = {
      requestHash,
      response,
      createdAt: now,
      expiresAt: now + this.config.ttlMs,
      tokens,
    }

    this.cache.set(requestHash, entry)
    this.accessOrder.push(requestHash)
    this.stats.size = this.cache.size
  }

  /**
   * 淘汰旧缓存 (LRU)
   */
  private evict(): void {
    if (this.accessOrder.length === 0) return

    const oldestKey = this.accessOrder.shift()
    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
    }
  }

  /**
   * 更新访问顺序 (LRU)
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
      this.accessOrder.push(key)
    }
  }

  /**
   * 删除缓存
   */
  delete(request: string): boolean {
    const requestHash = this.hashRequest(request)
    const result = this.cache.delete(requestHash)
    
    if (result) {
      const index = this.accessOrder.indexOf(requestHash)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
      this.stats.size = this.cache.size
    }
    
    return result
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.stats.size = 0
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key)
        const index = this.accessOrder.indexOf(key)
        if (index > -1) {
          this.accessOrder.splice(index, 1)
        }
        cleaned++
      }
    }

    this.stats.size = this.cache.size
    return cleaned
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    }
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 检查是否存在 (精确匹配)
   */
  has(request: string): boolean {
    const requestHash = this.hashRequest(request)
    const entry = this.cache.get(requestHash)
    return entry !== undefined && Date.now() < entry.expiresAt
  }
}

/**
 * 默认缓存实例
 */
export const semanticCache = new SemanticCache()

/**
 * 便捷缓存函数
 */
export function getCachedResponse(request: string): unknown | null {
  return semanticCache.get(request)
}

export function setCachedResponse(
  request: string,
  response: unknown,
  tokens?: number
): void {
  semanticCache.set(request, response, tokens)
}