/**
 * 配置中心模块
 * @module config-center
 * @version 1.10.0
 * @description 企业级配置中心系统，支持配置管理、版本控制、动态更新、访问控制和高可用
 */

// 核心类型定义
export * from './types';

// 核心组件
export { ConfigManager } from './config-manager';
export { VersionManager } from './version-manager';
export { EnvironmentManager } from './environment-manager';
export { ConfigCache } from './config-cache';
export { AccessController } from './access-control';
export { AuditLogger } from './audit-logger';
export { HighAvailabilityManager } from './high-availability';

// 存储适配器
export {
  MemoryStorageAdapter,
  RedisStorageAdapter,
  DatabaseStorageAdapter,
  FileStorageAdapter,
} from './storage-adapters';

// 导入类型
import { ConfigManager } from './config-manager';
import { MemoryStorageAdapter } from './storage-adapters';
import type {
  ConfigCenterOptions,
  ConfigEnvironment,
  ConfigItem,
  StorageAdapter,
} from './types';

/**
 * 创建配置中心实例
 * 
 * @param options - 配置中心选项
 * @returns 配置管理器实例
 * 
 * @example
 * ```typescript
 * // 使用默认内存存储
 * const configCenter = createConfigCenter();
 * 
 * // 使用自定义存储适配器
 * const configCenter = createConfigCenter({
 *   storageAdapter: new MemoryStorageAdapter(),
 *   defaultEnvironment: 'development',
 *   enableCache: true,
 *   enableVersioning: true,
 *   enableAuditLog: true,
 * });
 * ```
 */
export function createConfigCenter(options: ConfigCenterOptions = {}): ConfigManager {
  const storage = options.storageAdapter || new MemoryStorageAdapter();
  const manager = new ConfigManager(storage, options);
  
  return manager;
}

/**
 * 快速创建内存配置中心
 * 
 * @param options - 配置选项
 * @returns 配置管理器实例
 * 
 * @example
 * ```typescript
 * const configCenter = createMemoryConfigCenter({
 *   defaultEnvironment: 'development',
 *   enableCache: true,
 * });
 * 
 * // 设置配置
 * await configCenter.set('app.name', 'MyApp', {
 *   userId: 'admin',
 *   description: 'Application name',
 * });
 * 
 * // 获取配置
 * const appName = await configCenter.get<string>('app.name');
 * console.log(appName); // 'MyApp'
 * ```
 */
export function createMemoryConfigCenter(
  options: Omit<ConfigCenterOptions, 'storageAdapter'> = {}
): ConfigManager {
  const storage = new MemoryStorageAdapter();
  return new ConfigManager(storage, options);
}

/**
 * 配置中心默认配置
 */
export const DEFAULT_CONFIG_CENTER_OPTIONS: Required<Omit<ConfigCenterOptions, 'storageAdapter' | 'syncNodes'>> & {
  syncNodes: string[];
} = {
  defaultEnvironment: 'development',
  enableCache: true,
  cacheTtl: 300,
  enableAuditLog: true,
  enableVersioning: true,
  maxVersions: 100,
  enableAccessControl: true,
  enableHighAvailability: false,
  syncNodes: [],
};

/**
 * 配置中心辅助工具
 */
export class ConfigCenterUtils {
  /**
   * 合并配置选项
   */
  static mergeOptions(
    defaultOptions: ConfigCenterOptions,
    userOptions: ConfigCenterOptions
  ): ConfigCenterOptions {
    return {
      ...defaultOptions,
      ...userOptions,
    };
  }

  /**
   * 验证配置键名
   */
  static validateConfigKey(key: string): boolean {
    // 键名规则：字母、数字、点、下划线、连字符
    const pattern = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
    return pattern.test(key);
  }

  /**
   * 规范化配置键名
   */
  static normalizeConfigKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  }

  /**
   * 解析配置路径
   */
  static parseConfigPath(path: string): {
    environment?: ConfigEnvironment;
    group?: string;
    key: string;
  } {
    const parts = path.split('/');
    
    if (parts.length === 1) {
      return { key: parts[0] };
    } else if (parts.length === 2) {
      const [envOrGroup, key] = parts;
      
      if (['development', 'staging', 'production', 'test'].includes(envOrGroup)) {
        return {
          environment: envOrGroup as ConfigEnvironment,
          key,
        };
      } else {
        return {
          group: envOrGroup,
          key,
        };
      }
    } else {
      const [env, group, key] = parts;
      return {
        environment: env as ConfigEnvironment,
        group,
        key,
      };
    }
  }

  /**
   * 构建配置路径
   */
  static buildConfigPath(config: {
    environment?: ConfigEnvironment;
    group?: string;
    key: string;
  }): string {
    const parts: string[] = [];
    
    if (config.environment) {
      parts.push(config.environment);
    }
    
    if (config.group) {
      parts.push(config.group);
    }
    
    parts.push(config.key);
    
    return parts.join('/');
  }

  /**
   * 深度合并配置
   */
  static deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>
  ): T {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          result[key] = this.deepMerge(
            result[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          ) as T[Extract<keyof T, string>];
        } else {
          result[key] = source[key] as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }

  /**
   * 转换配置格式
   */
  static convertConfigFormat(
    configs: ConfigItem[],
    format: 'object' | 'env' | 'json'
  ): string | Record<string, unknown> {
    switch (format) {
      case 'object': {
        const result: Record<string, unknown> = {};
        for (const config of configs) {
          result[config.key] = config.value;
        }
        return result;
      }
      
      case 'env': {
        return configs
          .map(config => {
            const key = config.key.toUpperCase().replace(/\./g, '_');
            const value = typeof config.value === 'string'
              ? config.value
              : JSON.stringify(config.value);
            return `${key}=${value}`;
          })
          .join('\n');
      }
      
      case 'json': {
        return JSON.stringify(
          configs.reduce((acc, config) => {
            acc[config.key] = config.value;
            return acc;
          }, {} as Record<string, unknown>),
          null,
          2
        );
      }
      
      default:
        return configs as unknown as string | Record<string, unknown>;
    }
  }
}

/**
 * 配置中心版本
 */
export const CONFIG_CENTER_VERSION = '1.10.0';

/**
 * 默认导出
 */
export default ConfigManager;
