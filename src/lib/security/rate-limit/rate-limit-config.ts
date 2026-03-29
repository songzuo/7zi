/**
 * 速率限制配置管理
 *
 * 提供预设配置和自定义配置支持
 * 支持 per-route 配置
 */

import { RateLimitConfig } from './rate-limiter';

/**
 * 预设配置
 */
export const PresetConfigs: Record<string, Omit<RateLimitConfig, 'keyGenerator'>> = {
  /**
   * 严格配置：5 请求/分钟
   */
  strict: {
    windowMs: 60 * 1000,  // 1 分钟
    maxRequests: 5,
    algorithm: 'sliding-window',
  },

  /**
   * 中等配置：30 请求/分钟
   */
  moderate: {
    windowMs: 60 * 1000,  // 1 分钟
    maxRequests: 30,
    algorithm: 'sliding-window',
  },

  /**
   * 宽松配置：100 请求/分钟
   */
  lenient: {
    windowMs: 60 * 1000,  // 1 分钟
    maxRequests: 100,
    algorithm: 'token-bucket',
  },

  /**
   * 非常宽松配置：300 请求/分钟
   */
  veryLenient: {
    windowMs: 60 * 1000,  // 1 分钟
    maxRequests: 300,
    algorithm: 'token-bucket',
  },

  /**
   * 每小时配置：1000 请求/小时
   */
  hourly: {
    windowMs: 60 * 60 * 1000,  // 1 小时
    maxRequests: 1000,
    algorithm: 'sliding-window',
  },

  /**
   * 每日配置：10000 请求/天
   */
  daily: {
    windowMs: 24 * 60 * 60 * 1000,  // 1 天
    maxRequests: 10000,
    algorithm: 'sliding-window',
  },
};

/**
 * 路由配置
 */
export interface RouteConfig {
  pattern: string | RegExp;  // 路由模式（字符串或正则）
  config: Partial<RateLimitConfig>;  // 覆盖的配置
}

/**
 * 配置管理器
 */
export class RateLimitConfigManager {
  private defaultConfig: Omit<RateLimitConfig, 'keyGenerator'>;
  private routeConfigs: RouteConfig[] = [];

  constructor(defaultConfig?: Omit<RateLimitConfig, 'keyGenerator'>) {
    this.defaultConfig = defaultConfig || PresetConfigs.moderate;
  }

  /**
   * 获取默认的 keyGenerator
   */
  private getDefaultKeyGenerator(): (req: any) => string {
    return (req: any) => {
      // 默认使用 IP 地址作为 key
      return req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown';
    };
  }

  /**
   * 设置默认配置
   * @param config 配置
   */
  setDefaultConfig(config: Omit<RateLimitConfig, 'keyGenerator'>): void {
    this.defaultConfig = config;
  }

  /**
   * 获取默认配置
   * @returns 配置
   */
  getDefaultConfig(): Omit<RateLimitConfig, 'keyGenerator'> {
    return { ...this.defaultConfig };
  }

  /**
   * 添加路由配置
   * @param routeConfig 路由配置
   */
  addRouteConfig(routeConfig: RouteConfig): void {
    this.routeConfigs.push(routeConfig);
  }

  /**
   * 批量添加路由配置
   * @param configs 路由配置数组
   */
  addRouteConfigs(configs: RouteConfig[]): void {
    this.routeConfigs.push(...configs);
  }

  /**
   * 移除路由配置
   * @param pattern 路由模式
   */
  removeRouteConfig(pattern: string | RegExp): void {
    this.routeConfigs = this.routeConfigs.filter(
      config => config.pattern !== pattern
    );
  }

  /**
   * 清空路由配置
   */
  clearRouteConfigs(): void {
    this.routeConfigs = [];
  }

  /**
   * 获取路由配置
   * @param path 路径
   * @returns 配置或 null
   */
  getRouteConfig(path: string): Partial<RateLimitConfig> | null {
    for (const config of this.routeConfigs) {
      if (typeof config.pattern === 'string') {
        if (path === config.pattern || path.startsWith(config.pattern)) {
          return config.config;
        }
      } else if (config.pattern instanceof RegExp) {
        if (config.pattern.test(path)) {
          return config.config;
        }
      }
    }
    return null;
  }

  /**
   * 为特定路由创建完整配置
   * @param path 路径
   * @param keyGenerator 键生成器
   * @returns 完整配置
   */
  createConfigForRoute(
    path: string,
    keyGenerator: (req: any) => string
  ): RateLimitConfig {
    const routeConfig = this.getRouteConfig(path);

    // 合并配置：路由配置 > 默认配置
    const mergedConfig = {
      ...this.defaultConfig,
      ...routeConfig,
      keyGenerator,
    };

    return mergedConfig;
  }

  /**
   * 使用预设创建配置
   * @param presetName 预设名称
   * @param overrides 覆盖的配置
   * @param keyGenerator 键生成器
   * @returns 完整配置
   */
  createFromPreset(
    presetName: string,
    overrides?: Partial<Omit<RateLimitConfig, 'keyGenerator'>>,
    keyGenerator?: (req: any) => string
  ): RateLimitConfig {
    const preset = PresetConfigs[presetName];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetName}`);
    }

    // 合并配置：覆盖配置 > 预设配置
    const mergedConfig: RateLimitConfig = {
      ...preset,
      ...overrides,
      keyGenerator: keyGenerator || this.getDefaultKeyGenerator(),
    } as RateLimitConfig;

    return mergedConfig;
  }

  /**
   * 导出配置为 JSON
   * @returns JSON 字符串
   */
  exportConfig(): string {
    return JSON.stringify({
      defaultConfig: this.defaultConfig,
      routeConfigs: this.routeConfigs,
    }, null, 2);
  }

  /**
   * 从 JSON 导入配置
   * @param json JSON 字符串
   */
  importConfig(json: string): void {
    try {
      const data = JSON.parse(json);
      this.defaultConfig = data.defaultConfig || PresetConfigs.moderate;
      this.routeConfigs = data.routeConfigs || [];
    } catch (error) {
      throw new Error('Invalid config JSON');
    }
  }

  /**
   * 获取可用的预设名称
   * @returns 预设名称数组
   */
  getAvailablePresets(): string[] {
    return Object.keys(PresetConfigs);
  }
}

/**
 * 默认配置管理器实例
 */
export const defaultConfigManager = new RateLimitConfigManager(PresetConfigs.moderate);

/**
 * 常用路由配置预设
 */
export const CommonRouteConfigs: RouteConfig[] = [
  // 认证相关 - 严格限制
  {
    pattern: '/api/auth/login',
    config: { ...PresetConfigs.strict, algorithm: 'sliding-window' as const },
  },
  {
    pattern: '/api/auth/register',
    config: { ...PresetConfigs.strict, algorithm: 'sliding-window' as const },
  },
  {
    pattern: '/api/auth/forgot-password',
    config: { ...PresetConfigs.strict, algorithm: 'sliding-window' as const },
  },
  {
    pattern: '/api/auth/reset-password',
    config: { ...PresetConfigs.strict, algorithm: 'sliding-window' as const },
  },

  // 敏感操作 - 严格限制
  {
    pattern: '/api/payments/',
    config: { ...PresetConfigs.strict, algorithm: 'token-bucket' as const },
  },
  {
    pattern: '/api/withdrawals/',
    config: { ...PresetConfigs.strict, algorithm: 'token-bucket' as const },
  },

  // 数据导出 - 每小时限制
  {
    pattern: '/api/export/',
    config: PresetConfigs.hourly,
  },

  // 批量操作 - 每小时限制
  {
    pattern: '/api/batch/',
    config: PresetConfigs.hourly,
  },

  // 文件上传 - 适度限制
  {
    pattern: '/api/upload/',
    config: PresetConfigs.lenient,
  },

  // 公开 API - 每日限制
  {
    pattern: '/api/public/',
    config: PresetConfigs.daily,
  },
];
