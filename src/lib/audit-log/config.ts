/**
 * 审计日志系统 - 配置管理
 * @module lib/audit-log/config
 * @version 1.10.0
 */

import type {
  AuditLogConfig,
  AuditLogLevel,
  SensitiveFieldConfig,
  RetentionPolicy,
} from './types.js';

// ============================================================================
// 默认配置
// ============================================================================

/**
 * 默认敏感字段配置
 */
const DEFAULT_SENSITIVE_FIELDS: SensitiveFieldConfig[] = [
  // 密码相关
  { path: 'password', mask: 'full', encrypt: true },
  { path: 'user.password', mask: 'full', encrypt: true },
  { path: 'oldPassword', mask: 'full', encrypt: true },
  { path: 'newPassword', mask: 'full', encrypt: true },
  { path: 'currentPassword', mask: 'full', encrypt: true },

  // 令牌和密钥
  { path: 'token', mask: 'full', encrypt: true },
  { path: 'accessToken', mask: 'full', encrypt: true },
  { path: 'refreshToken', mask: 'full', encrypt: true },
  { path: 'apiKey', mask: 'full', encrypt: true },
  { path: 'secretKey', mask: 'full', encrypt: true },
  { path: 'privateKey', mask: 'full', encrypt: true },
  { path: 'authToken', mask: 'full', encrypt: true },

  // 个人敏感信息
  { path: 'ssn', mask: 'partial' },
  { path: 'socialSecurityNumber', mask: 'partial' },
  { path: 'creditCard', mask: 'partial' },
  { path: 'creditCardNumber', mask: 'partial' },
  { path: 'bankAccount', mask: 'partial' },
  { path: 'bankAccountNumber', mask: 'partial' },

  // 邮箱 (部分脱敏)
  { path: 'email', mask: 'partial' },
  { path: 'user.email', mask: 'partial' },

  // 电话号码 (部分脱敏)
  { path: 'phone', mask: 'partial' },
  { path: 'phoneNumber', mask: 'partial' },
  { path: 'mobile', mask: 'partial' },

  // 身份证号 (部分脱敏)
  { path: 'idCard', mask: 'partial' },
  { path: 'idNumber', mask: 'partial' },
  { path: 'nationalId', mask: 'partial' },

  // 地址 (部分脱敏)
  { path: 'address', mask: 'partial' },
  { path: 'homeAddress', mask: 'partial' },

  // 其他敏感字段
  { path: 'pin', mask: 'full', encrypt: true },
  { path: 'otp', mask: 'full', encrypt: true },
  { path: 'verificationCode', mask: 'full', encrypt: true },
];

/**
 * 默认保留策略
 */
const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  retentionDays: 90,
  archive: true,
  archivePath: './logs/audit/archive',
  compress: true,
  compressionFormat: 'gzip',
  notifyBeforeDeleteDays: 7,
};

/**
 * 默认审计日志配置
 */
export const DEFAULT_AUDIT_CONFIG: AuditLogConfig = {
  enabled: true,
  serviceName: 'openclaw',
  levelThreshold: 'info',
  sensitiveFields: DEFAULT_SENSITIVE_FIELDS,
  retention: DEFAULT_RETENTION_POLICY,
  enableSigning: true,
  asyncWrite: true,
  batchSize: 100,
  batchInterval: 5000,
  maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB
  logRequestBody: false,
  logResponseBody: false,
  maxBodyLogSize: 1024, // 1KB
  excludePaths: ['/health', '/metrics', '/favicon.ico'],
  customProcessors: [],
};

// ============================================================================
// 配置管理器
// ============================================================================

/**
 * 审计日志配置管理器
 */
export class AuditConfigManager {
  private config: AuditLogConfig;
  private configPath: string;

  constructor(configPath: string = './config/audit-log.json') {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  /**
   * 加载配置
   */
  private loadConfig(): AuditLogConfig {
    try {
      // 尝试从文件加载
      const fs = require('fs');
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(fileContent);
        return { ...DEFAULT_AUDIT_CONFIG, ...loadedConfig };
      }
    } catch (error) {
      console.warn(`Failed to load audit config from ${this.configPath}, using defaults:`, error);
    }
    return { ...DEFAULT_AUDIT_CONFIG };
  }

  /**
   * 保存配置
   */
  public saveConfig(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(this.configPath);

      // 确保目录存在
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save audit config to ${this.configPath}:`, error);
      throw error;
    }
  }

  /**
   * 获取配置
   */
  public getConfig(): AuditLogConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<AuditLogConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * 重置为默认配置
   */
  public resetToDefaults(): void {
    this.config = { ...DEFAULT_AUDIT_CONFIG };
    this.saveConfig();
  }

  /**
   * 检查是否启用
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 检查日志级别是否应该记录
   */
  public shouldLog(level: AuditLogLevel): boolean {
    const levels: AuditLogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const thresholdIndex = levels.indexOf(this.config.levelThreshold);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= thresholdIndex;
  }

  /**
   * 获取敏感字段配置
   */
  public getSensitiveFields(): SensitiveFieldConfig[] {
    return [...this.config.sensitiveFields];
  }

  /**
   * 添加敏感字段
   */
  public addSensitiveField(field: SensitiveFieldConfig): void {
    this.config.sensitiveFields.push(field);
    this.saveConfig();
  }

  /**
   * 移除敏感字段
   */
  public removeSensitiveField(path: string): void {
    this.config.sensitiveFields = this.config.sensitiveFields.filter(
      (f) => f.path !== path
    );
    this.saveConfig();
  }

  /**
   * 获取保留策略
   */
  public getRetentionPolicy(): RetentionPolicy {
    return { ...this.config.retention };
  }

  /**
   * 更新保留策略
   */
  public updateRetentionPolicy(policy: Partial<RetentionPolicy>): void {
    this.config.retention = { ...this.config.retention, ...policy };
    this.saveConfig();
  }

  /**
   * 检查路径是否被排除
   */
  public isPathExcluded(path: string): boolean {
    if (!this.config.excludePaths) {
      return false;
    }
    return this.config.excludePaths.some((excluded) => {
      if (excluded.endsWith('*')) {
        return path.startsWith(excluded.slice(0, -1));
      }
      return path === excluded;
    });
  }

  /**
   * 验证配置
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.retention.retentionDays < 1) {
      errors.push('retentionDays must be at least 1');
    }

    if (this.config.batchSize && this.config.batchSize < 1) {
      errors.push('batchSize must be at least 1');
    }

    if (this.config.batchInterval && this.config.batchInterval < 100) {
      errors.push('batchInterval must be at least 100ms');
    }

    if (this.config.maxStorageSize && this.config.maxStorageSize < 1024 * 1024) {
      errors.push('maxStorageSize must be at least 1MB');
    }

    if (this.config.enableSigning && !this.config.signingKey) {
      errors.push('signingKey is required when enableSigning is true');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取配置摘要 (用于日志)
   */
  public getConfigSummary(): Record<string, unknown> {
    return {
      enabled: this.config.enabled,
      serviceName: this.config.serviceName,
      levelThreshold: this.config.levelThreshold,
      sensitiveFieldsCount: this.config.sensitiveFields.length,
      retentionDays: this.config.retention.retentionDays,
      archiveEnabled: this.config.retention.archive,
      signingEnabled: this.config.enableSigning,
      asyncWrite: this.config.asyncWrite,
      batchSize: this.config.batchSize,
      maxStorageSize: this.config.maxStorageSize,
    };
  }
}

// ============================================================================
// 全局配置实例
// ============================================================================

/**
 * 全局配置管理器实例
 */
let globalConfigManager: AuditConfigManager | null = null;

/**
 * 获取全局配置管理器
 */
export function getConfigManager(configPath?: string): AuditConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new AuditConfigManager(configPath);
  }
  return globalConfigManager;
}

/**
 * 重置全局配置管理器 (主要用于测试)
 */
export function resetConfigManager(): void {
  globalConfigManager = null;
}

/**
 * 获取当前配置
 */
export function getCurrentConfig(): AuditLogConfig {
  return getConfigManager().getConfig();
}

/**
 * 更新当前配置
 */
export function updateCurrentConfig(updates: Partial<AuditLogConfig>): void {
  getConfigManager().updateConfig(updates);
}