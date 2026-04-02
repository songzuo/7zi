/**
 * Rate Limit Configuration
 *
 * 支持环境变量配置的速率限制设置
 */

export interface RateLimitEnvironmentConfig {
  /**
   * 时间窗口（毫秒）
   * 环境变量: RATE_LIMIT_WINDOW_MS
   * 默认值: 60000 (1分钟)
   */
  windowMs: number

  /**
   * 时间窗口内最大请求数
   * 环境变量: RATE_LIMIT_MAX_REQUESTS
   * 默认值: 100
   */
  maxRequests: number

  /**
   * 启用 Redis 分布式限流
   * 环境变量: ENABLE_REDIS_RATE_LIMIT
   * 默认值: false (使用内存限流)
   */
  useRedis: boolean

  /**
   * 限流维度
   * 环境变量: RATE_LIMIT_BY
   * 可选值: 'ip', 'userId', 'both'
   * 默认值: 'ip'
   */
  limitBy: 'ip' | 'userId' | 'both'

  /**
   * 是否在失败时放行（fail-open）
   * 环境变量: RATE_LIMIT_FAIL_OPEN
   * 默认值: true (Redis 不可用时仍然允许请求)
   */
  failOpen: boolean

  /**
   * 限流器缓存 TTL（秒）
   * 环境变量: RATE_LIMIT_CACHE_TTL
   * 默认值: 3600 (1小时)
   */
  cacheTTL: number
}

/**
 * 从环境变量加载限流配置
 */
export function getRateLimitEnvConfig(): RateLimitEnvironmentConfig {
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    useRedis: process.env.ENABLE_REDIS_RATE_LIMIT === 'true',
    limitBy: (process.env.RATE_LIMIT_BY as 'ip' | 'userId' | 'both') || 'ip',
    failOpen: process.env.RATE_LIMIT_FAIL_OPEN !== 'false',
    cacheTTL: parseInt(process.env.RATE_LIMIT_CACHE_TTL || '3600', 10),
  }
}

/**
 * 验证限流配置的有效性
 */
export function validateRateLimitConfig(config: RateLimitEnvironmentConfig): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (config.windowMs <= 0) {
    errors.push('RATE_LIMIT_WINDOW_MS must be greater than 0')
  }

  if (config.maxRequests <= 0) {
    errors.push('RATE_LIMIT_MAX_REQUESTS must be greater than 0')
  }

  if (config.cacheTTL <= 0) {
    errors.push('RATE_LIMIT_CACHE_TTL must be greater than 0')
  }

  if (!['ip', 'userId', 'both'].includes(config.limitBy)) {
    errors.push('RATE_LIMIT_BY must be one of: ip, userId, both')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 获取默认的限流配置
 */
export function getDefaultRateLimitConfig(): RateLimitEnvironmentConfig {
  return {
    windowMs: 60000,
    maxRequests: 100,
    useRedis: false,
    limitBy: 'ip',
    failOpen: true,
    cacheTTL: 3600,
  }
}

/**
 * 合并环境配置和默认配置
 */
export function mergeRateLimitConfig(
  envConfig: Partial<RateLimitEnvironmentConfig> = {}
): RateLimitEnvironmentConfig {
  const defaultConfig = getDefaultRateLimitConfig()
  const envFromProcess = getRateLimitEnvConfig()

  return {
    ...defaultConfig,
    ...envFromProcess,
    ...envConfig,
  }
}
