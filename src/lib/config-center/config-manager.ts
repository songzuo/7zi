/**
 * 配置管理器 - 核心模块
 * @module config-center/config-manager
 * @version 1.10.0
 */

import {
  ConfigItem,
  ConfigEnvironment,
  ConfigStatus,
  ConfigQuery,
  ConfigChangeListener,
  ConfigChangeEvent,
  ConfigCenterOptions,
  StorageAdapter,
  HotReloadResult,
} from './types';
import { VersionManager } from './version-manager';
import { EnvironmentManager } from './environment-manager';
import { ConfigCache } from './config-cache';
import { AuditLogger } from './audit-logger';
import { AccessController } from './access-control';
import { v4 as uuidv4 } from 'uuid';

/**
 * 配置管理器
 * 
 * 提供配置的增删改查、版本管理、环境隔离等核心功能
 */
export class ConfigManager {
  private storage: StorageAdapter;
  private options: Required<ConfigCenterOptions>;
  private versionManager: VersionManager;
  private environmentManager: EnvironmentManager;
  private cache: ConfigCache | null = null;
  private auditLogger: AuditLogger | null = null;
  private accessController: AccessController | null = null;
  private listeners: Map<string, Set<ConfigChangeListener>> = new Map();
  private initialized = false;

  constructor(storage: StorageAdapter, options: ConfigCenterOptions = {}) {
    this.storage = storage;
    this.options = {
      defaultEnvironment: options.defaultEnvironment || 'development',
      enableCache: options.enableCache ?? true,
      cacheTtl: options.cacheTtl ?? 300,
      enableAuditLog: options.enableAuditLog ?? true,
      enableVersioning: options.enableVersioning ?? true,
      maxVersions: options.maxVersions ?? 100,
      enableAccessControl: options.enableAccessControl ?? true,
      enableHighAvailability: options.enableHighAvailability ?? false,
      syncNodes: options.syncNodes || [],
      storageAdapter: storage,
    };

    this.versionManager = new VersionManager(this.storage, this.options.maxVersions);
    this.environmentManager = new EnvironmentManager();

    if (this.options.enableCache) {
      this.cache = new ConfigCache(this.options.cacheTtl);
    }

    if (this.options.enableAuditLog) {
      this.auditLogger = new AuditLogger(this.storage);
    }

    if (this.options.enableAccessControl) {
      this.accessController = new AccessController(this.storage);
    }
  }

  /**
   * 初始化配置管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.storage.initialize();
    await this.versionManager.initialize();

    if (this.auditLogger) {
      await this.auditLogger.initialize();
    }

    if (this.accessController) {
      await this.accessController.initialize();
    }

    this.initialized = true;
  }

  /**
   * 获取配置值
   */
  async get<T = unknown>(
    key: string,
    environment?: ConfigEnvironment,
    options: {
      skipCache?: boolean;
      defaultValue?: T;
    } = {}
  ): Promise<T | undefined> {
    const env = environment || this.options.defaultEnvironment;
    const { skipCache = false, defaultValue } = options;

    // 尝试从缓存获取
    if (!skipCache && this.cache) {
      const cached = this.cache.get(key, env);
      if (cached !== undefined) {
        return cached.value as T;
      }
    }

    // 从存储获取
    const config = await this.storage.getConfig(key, env);
    
    if (!config) {
      return defaultValue;
    }

    // 检查状态
    if (config.status !== 'active') {
      return defaultValue;
    }

    // 更新缓存
    if (this.cache) {
      this.cache.set(key, config.value, env, config.version);
    }

    return config.value as T;
  }

  /**
   * 批量获取配置
   */
  async getMultiple<T = unknown>(
    keys: string[],
    environment?: ConfigEnvironment
  ): Promise<Record<string, T>> {
    const env = environment || this.options.defaultEnvironment;
    const result: Record<string, T> = {};

    // 分离缓存命中和未命中
    const cacheMisses: string[] = [];
    
    if (this.cache) {
      for (const key of keys) {
        const cached = this.cache.get(key, env);
        if (cached !== undefined) {
          result[key] = cached.value as T;
        } else {
          cacheMisses.push(key);
        }
      }
    } else {
      cacheMisses.push(...keys);
    }

    // 批量获取未命中的配置
    if (cacheMisses.length > 0) {
      const configs = await this.storage.getConfigs(cacheMisses, env);
      
      for (const config of configs) {
        if (config.status === 'active') {
          result[config.key] = config.value as T;
          
          if (this.cache) {
            this.cache.set(config.key, config.value, env, config.version);
          }
        }
      }
    }

    return result;
  }

  /**
   * 设置配置
   */
  async set(
    key: string,
    value: unknown,
    options: {
      environment?: ConfigEnvironment;
      group?: string;
      description?: string;
      sensitive?: boolean;
      dynamic?: boolean;
      validation?: ConfigItem['validation'];
      metadata?: Record<string, unknown>;
      tags?: string[];
      userId: string;
    }
  ): Promise<ConfigItem> {
    const env = options.environment || this.options.defaultEnvironment;

    // 权限检查
    if (this.accessController) {
      const hasPermission = await this.accessController.checkPermission(
        options.userId,
        'config',
        key,
        'write',
        env
      );
      if (!hasPermission) {
        throw new Error(`User ${options.userId} does not have write permission for config ${key}`);
      }
    }

    // 获取现有配置
    const existingConfig = await this.storage.getConfig(key, env);
    const oldValue = existingConfig?.value;

    // 创建或更新配置
    const now = new Date();
    const config: ConfigItem = {
      id: existingConfig?.id || uuidv4(),
      key,
      value,
      valueType: this.detectValueType(value),
      environment: env,
      group: options.group || existingConfig?.group || 'default',
      description: options.description || existingConfig?.description,
      status: 'active',
      sensitive: options.sensitive ?? existingConfig?.sensitive ?? false,
      dynamic: options.dynamic ?? existingConfig?.dynamic ?? false,
      validation: options.validation || existingConfig?.validation,
      metadata: { ...existingConfig?.metadata, ...options.metadata },
      tags: options.tags || existingConfig?.tags,
      createdAt: existingConfig?.createdAt || now,
      updatedAt: now,
      createdBy: existingConfig?.createdBy || options.userId,
      updatedBy: options.userId,
      version: (existingConfig?.version || 0) + 1,
    };

    // 验证配置值
    this.validateConfigValue(config);

    // 保存配置
    await this.storage.setConfig(config);

    // 创建版本记录
    if (this.options.enableVersioning) {
      await this.versionManager.createVersion(config, existingConfig ? 'update' : 'create', options.userId);
    }

    // 记录审计日志
    if (this.auditLogger) {
      await this.auditLogger.log({
        action: existingConfig ? 'update' : 'create',
        resourceType: 'config',
        resourceId: config.id,
        resourceName: key,
        before: existingConfig ? { value: oldValue } : undefined,
        after: { value },
        operatorId: options.userId,
        operatorType: 'user',
        timestamp: now,
        result: 'success',
        environment: env,
        metadata: options.metadata,
      });
    }

    // 更新缓存
    if (this.cache) {
      this.cache.set(key, value, env, config.version);
    }

    // 触发变更事件
    await this.emitChangeEvent({
      type: existingConfig ? 'updated' : 'created',
      config,
      oldValue,
      newValue: value,
      timestamp: now,
      changedBy: options.userId,
      environment: env,
    });

    return config;
  }

  /**
   * 删除配置
   */
  async delete(
    key: string,
    environment: ConfigEnvironment,
    options: { userId: string }
  ): Promise<void> {
    const env = environment || this.options.defaultEnvironment;

    // 权限检查
    if (this.accessController) {
      const hasPermission = await this.accessController.checkPermission(
        options.userId,
        'config',
        key,
        'delete',
        env
      );
      if (!hasPermission) {
        throw new Error(`User ${options.userId} does not have delete permission for config ${key}`);
      }
    }

    // 获取现有配置
    const config = await this.storage.getConfig(key, env);
    if (!config) {
      throw new Error(`Config ${key} not found in environment ${env}`);
    }

    // 删除配置
    await this.storage.deleteConfig(key, env);

    // 创建版本记录
    if (this.options.enableVersioning) {
      await this.versionManager.createVersion(config, 'delete', options.userId);
    }

    // 记录审计日志
    if (this.auditLogger) {
      await this.auditLogger.log({
        action: 'delete',
        resourceType: 'config',
        resourceId: config.id,
        resourceName: key,
        before: { value: config.value },
        operatorId: options.userId,
        operatorType: 'user',
        timestamp: new Date(),
        result: 'success',
        environment: env,
      });
    }

    // 清除缓存
    if (this.cache) {
      this.cache.delete(key, env);
    }

    // 触发变更事件
    await this.emitChangeEvent({
      type: 'deleted',
      config,
      oldValue: config.value,
      timestamp: new Date(),
      changedBy: options.userId,
      environment: env,
    });
  }

  /**
   * 查询配置
   */
  async query(query: ConfigQuery): Promise<ConfigItem[]> {
    return await this.storage.queryConfigs(query);
  }

  /**
   * 获取所有配置
   */
  async getAll(environment?: ConfigEnvironment): Promise<ConfigItem[]> {
    const env = environment || this.options.defaultEnvironment;
    return await this.storage.getAllConfigs(env);
  }

  /**
   * 热加载配置
   */
  async hotReload(
    keys?: string[],
    environment?: ConfigEnvironment
  ): Promise<HotReloadResult> {
    const startTime = Date.now();
    const env = environment || this.options.defaultEnvironment;

    try {
      let configs: ConfigItem[];

      if (keys && keys.length > 0) {
        configs = await this.storage.getConfigs(keys, env);
      } else {
        configs = await this.storage.getAllConfigs(env);
      }

      const reloadedConfigs: ConfigItem[] = [];
      const failedConfigs: Array<{ key: string; error: string }> = [];

      for (const config of configs) {
        try {
          if (config.dynamic && config.status === 'active') {
            // 更新缓存
            if (this.cache) {
              this.cache.set(config.key, config.value, env, config.version);
            }

            reloadedConfigs.push(config);

            // 触发热加载事件
            await this.emitChangeEvent({
              type: 'updated',
              config,
              newValue: config.value,
              timestamp: new Date(),
              changedBy: 'system',
              environment: env,
            });
          }
        } catch (error) {
          failedConfigs.push({
            key: config.key,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: failedConfigs.length === 0,
        reloadedCount: reloadedConfigs.length,
        failedConfigs: failedConfigs.length > 0 ? failedConfigs : undefined,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        reloadedCount: 0,
        failedConfigs: [{ key: '*', error: error instanceof Error ? error.message : 'Unknown error' }],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 监听配置变更
   */
  onChange(key: string | string[] | '*', listener: ConfigChangeListener): () => void {
    const keys = key === '*' ? ['*'] : Array.isArray(key) ? key : [key];

    for (const k of keys) {
      if (!this.listeners.has(k)) {
        this.listeners.set(k, new Set());
      }
      this.listeners.get(k)!.add(listener);
    }

    // 返回取消监听函数
    return () => {
      for (const k of keys) {
        this.listeners.get(k)?.delete(listener);
        if (this.listeners.get(k)?.size === 0) {
          this.listeners.delete(k);
        }
      }
    };
  }

  /**
   * 触发变更事件
   */
  private async emitChangeEvent(event: ConfigChangeEvent): Promise<void> {
    const listenersToNotify: ConfigChangeListener[] = [];

    // 特定键的监听器
    const specificListeners = this.listeners.get(event.config.key);
    if (specificListeners) {
      listenersToNotify.push(...specificListeners);
    }

    // 通配符监听器
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      listenersToNotify.push(...wildcardListeners);
    }

    // 异步调用所有监听器
    await Promise.all(
      listenersToNotify.map(async (listener) => {
        try {
          await listener(event);
        } catch (error) {
          console.error('Error in config change listener:', error);
        }
      })
    );
  }

  /**
   * 检测值类型
   */
  private detectValueType(value: unknown): ConfigItem['valueType'] {
    if (value === null || value === undefined) {
      return 'string';
    }

    if (Array.isArray(value)) {
      return 'array';
    }

    const type = typeof value;
    
    switch (type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        return 'object';
      default:
        return 'json';
    }
  }

  /**
   * 验证配置值
   */
  private validateConfigValue(config: ConfigItem): void {
    if (!config.validation) {
      return;
    }

    const { validation } = config;
    const value = config.value;

    // 必填检查
    if (validation.required && (value === null || value === undefined || value === '')) {
      throw new Error(`Config ${config.key} is required`);
    }

    // 类型检查
    if (value !== null && value !== undefined) {
      const actualType = this.detectValueType(value);
      if (actualType !== config.valueType) {
        throw new Error(
          `Config ${config.key} type mismatch: expected ${config.valueType}, got ${actualType}`
        );
      }
    }

    // 最小值/最小长度检查
    if (validation.min !== undefined && typeof value === 'number') {
      if (value < validation.min) {
        throw new Error(
          `Config ${config.key} must be at least ${validation.min}, got ${value}`
        );
      }
    }

    // 最大值/最大长度检查
    if (validation.max !== undefined && typeof value === 'number') {
      if (value > validation.max) {
        throw new Error(
          `Config ${config.key} must be at most ${validation.max}, got ${value}`
        );
      }
    }

    // 正则表达式检查
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        throw new Error(
          validation.errorMessage || 
          `Config ${config.key} does not match pattern ${validation.pattern}`
        );
      }
    }

    // 枚举值检查
    if (validation.enum && !validation.enum.includes(value)) {
      throw new Error(
        `Config ${config.key} must be one of: ${validation.enum.join(', ')}`
      );
    }
  }

  /**
   * 获取环境管理器
   */
  getEnvironmentManager(): EnvironmentManager {
    return this.environmentManager;
  }

  /**
   * 获取版本管理器
   */
  getVersionManager(): VersionManager {
    return this.versionManager;
  }

  /**
   * 获取访问控制器
   */
  getAccessController(): AccessController | null {
    return this.accessController;
  }

  /**
   * 获取审计日志器
   */
  getAuditLogger(): AuditLogger | null {
    return this.auditLogger;
  }

  /**
   * 清除缓存
   */
  clearCache(key?: string, environment?: ConfigEnvironment): void {
    if (this.cache) {
      if (key) {
        const env = environment || this.options.defaultEnvironment;
        this.cache.delete(key, env);
      } else {
        this.cache.clear();
      }
    }
  }

  /**
   * 关闭配置管理器
   */
  async close(): Promise<void> {
    await this.storage.close();
    this.listeners.clear();
    this.initialized = false;
  }
}
