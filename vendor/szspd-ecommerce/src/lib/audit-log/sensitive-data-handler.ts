/**
 * 审计日志系统 - 敏感数据处理
 * @module lib/audit-log/sensitive-data-handler
 * @version 1.10.0
 */

import type {
  AuditEvent,
  SensitiveFieldConfig,
  AuditChangeDetail,
} from './types.js';
import crypto from 'crypto';

/**
 * 敏感数据处理器
 */
export class AuditSensitiveDataHandler {
  private sensitiveFields: Map<string, SensitiveFieldConfig>;

  constructor(sensitiveFields: SensitiveFieldConfig[] = []) {
    this.sensitiveFields = new Map();
    sensitiveFields.forEach((field) => {
      this.sensitiveFields.set(field.path, field);
    });
  }

  /**
   * 脱敏审计事件中的敏感数据
   */
  public maskSensitiveData(event: AuditEvent): AuditEvent {
    const maskedEvent = JSON.parse(JSON.stringify(event));

    // 脱敏用户上下文
    if (maskedEvent.user) {
      maskedEvent.user = this.maskObject(maskedEvent.user, 'user');
    }

    // 脱敏请求上下文
    if (maskedEvent.request) {
      maskedEvent.request = this.maskObject(maskedEvent.request, 'request');
    }

    // 脱敏资源信息
    if (maskedEvent.resource) {
      maskedEvent.resource = this.maskObject(maskedEvent.resource, 'resource');
    }

    // 脱敏详情
    if (maskedEvent.details) {
      maskedEvent.details = this.maskObject(maskedEvent.details, 'details');
    }

    // 脱敏变更记录
    if (maskedEvent.changes) {
      maskedEvent.changes = maskedEvent.changes.map((change: AuditChangeDetail) => {
        return {
          ...change,
          oldValue: this.maskValue(change.oldValue, change.field),
          newValue: this.maskValue(change.newValue, change.field),
        };
      });
    }

    // 脱敏错误信息 (可能包含敏感数据)
    if (maskedEvent.error) {
      maskedEvent.error.message = this.maskString(maskedEvent.error.message);
      // 不脱敏堆栈信息，因为可能用于调试
    }

    // 脱敏元数据
    if (maskedEvent.metadata) {
      maskedEvent.metadata = this.maskObject(maskedEvent.metadata, 'metadata');
    }

    return maskedEvent;
  }

  /**
   * 脱敏对象
   */
  private maskObject(obj: Record<string, unknown>, prefix: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = `${prefix}.${key}`;
      const config = this.sensitiveFields.get(fieldPath) ||
                    this.sensitiveFields.get(key);

      if (config) {
        result[key] = this.maskValue(value, fieldPath, config);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.maskObject(value as Record<string, unknown>, fieldPath);
      } else if (Array.isArray(value)) {
        result[key] = this.maskArray(value, fieldPath);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 脱敏数组
   */
  private maskArray(arr: unknown[], prefix: string): unknown[] {
    return arr.map((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return this.maskObject(item as Record<string, unknown>, `${prefix}[${index}]`);
      }
      return item;
    });
  }

  /**
   * 脱敏值
   */
  private maskValue(
    value: unknown,
    fieldPath: string,
    config?: SensitiveFieldConfig
  ): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    // 如果没有配置，检查是否有通配符匹配
    if (!config) {
      for (const [path, cfg] of this.sensitiveFields.entries()) {
        if (path.endsWith('*') && fieldPath.startsWith(path.slice(0, -1))) {
          config = cfg;
          break;
        }
      }
    }

    // 如果仍然没有配置，返回原值
    if (!config) {
      return value;
    }

    // 根据类型脱敏
    if (typeof value === 'string') {
      return this.maskString(value, config.mask);
    } else if (typeof value === 'number') {
      return this.maskNumber(value, config.mask);
    } else if (typeof value === 'boolean') {
      return value; // 布尔值不脱敏
    } else if (typeof value === 'object') {
      return this.maskObject(value as Record<string, unknown>, fieldPath);
    }

    return value;
  }

  /**
   * 脱敏字符串
   */
  private maskString(str: string, maskType: SensitiveFieldConfig['mask'] = 'partial'): string {
    if (!str || str.length === 0) {
      return str;
    }

    switch (maskType) {
      case 'full':
        return '***';

      case 'partial':
        // 保留前2个和后2个字符
        if (str.length <= 4) {
          return '***';
        }
        return `${str.slice(0, 2)}${'*'.repeat(str.length - 4)}${str.slice(-2)}`;

      case 'hash':
        return this.hashString(str);

      default:
        return '***';
    }
  }

  /**
   * 脱敏数字
   */
  private maskNumber(num: number, maskType: SensitiveFieldConfig['mask'] = 'partial'): number {
    switch (maskType) {
      case 'full':
        return 0;

      case 'partial':
        // 保留前2位
        const str = num.toString();
        if (str.length <= 2) {
          return 0;
        }
        return parseInt(str.slice(0, 2) + '0'.repeat(str.length - 2), 10);

      case 'hash':
        // 数字哈希后转为数字
        const hash = this.hashString(num.toString());
        return parseInt(hash.slice(0, 8), 16) % 1000000;

      default:
        return 0;
    }
  }

  /**
   * 哈希字符串
   */
  private hashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
  }

  /**
   * 添加敏感字段配置
   */
  public addSensitiveField(config: SensitiveFieldConfig): void {
    this.sensitiveFields.set(config.path, config);
  }

  /**
   * 移除敏感字段配置
   */
  public removeSensitiveField(path: string): void {
    this.sensitiveFields.delete(path);
  }

  /**
   * 检查字段是否敏感
   */
  public isSensitiveField(path: string): boolean {
    if (this.sensitiveFields.has(path)) {
      return true;
    }

    // 检查通配符匹配
    for (const fieldPath of this.sensitiveFields.keys()) {
      if (fieldPath.endsWith('*') && path.startsWith(fieldPath.slice(0, -1))) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取所有敏感字段路径
   */
  public getSensitiveFieldPaths(): string[] {
    return Array.from(this.sensitiveFields.keys());
  }

  /**
   * 清空所有敏感字段配置
   */
  public clearSensitiveFields(): void {
    this.sensitiveFields.clear();
  }

  /**
   * 从对象中提取敏感字段值 (用于加密)
   */
  public extractSensitiveValues(obj: Record<string, unknown>): Map<string, string> {
    const sensitiveValues = new Map<string, string>();

    const extract = (value: unknown, path: string): void => {
      if (value === null || value === undefined) {
        return;
      }

      if (typeof value === 'string' && this.isSensitiveField(path)) {
        sensitiveValues.set(path, value);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, val] of Object.entries(value)) {
          extract(val, `${path}.${key}`);
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          extract(item, `${path}[${index}]`);
        });
      }
    };

    extract(obj, '');
    return sensitiveValues;
  }

  /**
   * 验证敏感数据是否已正确脱敏
   */
  public validateMaskedData(event: AuditEvent): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    const checkValue = (value: unknown, path: string): void => {
      if (value === null || value === undefined) {
        return;
      }

      if (typeof value === 'string') {
        // 检查是否包含原始敏感数据
        if (this.isSensitiveField(path)) {
          // 简单检查：如果字符串长度大于4且不包含*，可能未脱敏
          if (value.length > 4 && !value.includes('*') && !value.match(/^[a-f0-9]{16}$/)) {
            issues.push(`Sensitive field ${path} may not be properly masked`);
          }
        }
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, val] of Object.entries(value)) {
          checkValue(val, `${path}.${key}`);
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          checkValue(item, `${path}[${index}]`);
        });
      }
    };

    checkValue(event, '');

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}