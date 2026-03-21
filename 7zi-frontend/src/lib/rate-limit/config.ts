/**
 * Rate Limiting Configuration
 *
 * 速率限制配置定义
 */

export interface RateLimitConfig {
  /**
   * 时间窗口（毫秒）
   */
  windowMs: number;

  /**
   * 时间窗口内最大请求数
   */
  maxRequests: number;

  /**
   * 是否跳过成功请求（只统计失败的请求）
   */
  skipSuccessfulRequests?: boolean;

  /**
   * 是否跳过失败请求
   */
  skipFailedRequests?: boolean;

  /**
   * 自定义键生成器（用于根据请求生成唯一标识）
   */
  keyGenerator?: (request: Request) => string;

  /**
   * 自定义跳过函数（用于判断是否跳过限流）
   */
  skip?: (request: Request) => boolean;

  /**
   * 是否使用 Redis（分布式部署时启用）
   */
  useRedis?: boolean;

  /**
   * Redis 配置（当 useRedis=true 时需要）
   */
  redisConfig?: {
    host?: string;
    port?: number;
    password?: string;
    url?: string;
    db?: number;
  };
}

/**
 * 预定义的限流配置
 */
export const RateLimitPresets: Record<string, RateLimitConfig> = {
  /**
   * 默认限流：100 请求/分钟
   */
  default: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 100,
    useRedis: false, // 默认使用内存存储
  },

  /**
   * 严格限流：5 请求/分钟（用于敏感端点）
   */
  strict: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 5,
    useRedis: false,
  },

  /**
   * 登录限流：5 请求/分钟/IP
   */
  auth: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 5,
    useRedis: false,
  },

  /**
   * 注册限流：3 请求/小时/IP
   */
  registration: {
    windowMs: 60 * 60 * 1000, // 1 小时
    maxRequests: 3,
    useRedis: false,
  },

  /**
   * 密码重置限流：3 请求/小时/IP
   */
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 小时
    maxRequests: 3,
    useRedis: false,
  },

  /**
   * API 限流：1000 请求/小时
   */
  api: {
    windowMs: 60 * 60 * 1000, // 1 小时
    maxRequests: 1000,
    useRedis: false,
  },

  /**
   * 宽松限流：1000 请求/分钟（用于测试环境）
   */
  permissive: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 1000,
    useRedis: false,
  },
};

/**
 * 路由路径映射到限流配置
 */
export const RouteRateLimits: Record<string, keyof typeof RateLimitPresets> = {
  // 认证相关端点 - 严格限流
  '/api/auth/login': 'auth',
  '/api/auth/register': 'registration',
  '/api/auth/logout': 'auth',
  '/api/auth/refresh': 'auth',
  '/api/auth/forgot-password': 'passwordReset',
  '/api/auth/reset-password': 'passwordReset',

  // 用户相关端点 - 默认限流
  '/api/users': 'default',
  '/api/users/[id]': 'default',

  // 项目相关端点 - 默认限流
  '/api/projects': 'default',
  '/api/projects/[id]': 'default',

  // 通知相关端点 - 宽松限流
  '/api/notifications': 'permissive',
  '/api/notifications/[id]': 'permissive',

  // MCP RPC - API 限流
  '/api/mcp/rpc': 'api',
};

/**
 * 根据路径获取限流配置
 */
export function getRateLimitForPath(pathname: string): RateLimitConfig {
  // 精确匹配
  if (RouteRateLimits[pathname]) {
    return RateLimitPresets[RouteRateLimits[pathname]];
  }

  // 模式匹配（处理动态路由）
  for (const [pattern, preset] of Object.entries(RouteRateLimits)) {
    const regexPattern = pattern.replace(/\[.*?\]/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(pathname)) {
      return RateLimitPresets[preset];
    }
  }

  // 默认返回默认配置
  return RateLimitPresets.default;
}
