/**
 * Rate Limit Storage Interface
 *
 * 速率限制存储接口，支持多种存储后端
 */

export interface RateLimitEntry {
  count: number
  resetTime: number
  windowStart: number
}

export interface IRateLimitStorage {
  /**
   * 增加请求计数
   */
  increment(key: string, windowMs: number): Promise<RateLimitEntry>

  /**
   * 获取当前计数
   */
  get(key: string): Promise<RateLimitEntry | null>

  /**
   * 重置计数
   */
  reset(key: string): Promise<void>

  /**
   * 清理过期数据
   */
  cleanup(): Promise<number>

  /**
   * 关闭连接
   */
  close(): Promise<void>
}
