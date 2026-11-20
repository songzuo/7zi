/**
 * 审计日志系统 - 存储工厂
 * @module lib/audit-log/storage/storage-factory
 * @version 1.10.0
 */

import type { AuditLogStorage } from '../types.js';
import { FileAuditStorage } from './file-storage.js';
import { MemoryAuditStorage } from './memory-storage.js';

/**
 * 存储类型
 */
export type StorageType = 'file' | 'memory' | 'database';

/**
 * 存储配置
 */
export interface StorageConfig {
  type: StorageType;
  options?: {
    // 文件存储选项
    basePath?: string;
    maxFileSize?: number;
    compressionEnabled?: boolean;

    // 内存存储选项
    maxEvents?: number;

    // 数据库存储选项 (未来扩展)
    connectionString?: string;
    tableName?: string;
  };
}

/**
 * 审计日志存储工厂
 */
export class AuditStorageFactory {
  /**
   * 创建存储实例
   */
  public static create(config?: StorageConfig): AuditLogStorage {
    const storageConfig = config || this.getDefaultConfig();

    switch (storageConfig.type) {
      case 'file':
        return new FileAuditStorage(storageConfig.options);
      case 'memory':
        return new MemoryAuditStorage(storageConfig.options);
      case 'database':
        throw new Error('Database storage not yet implemented');
      default:
        throw new Error(`Unknown storage type: ${storageConfig.type}`);
    }
  }

  /**
   * 创建默认存储 (文件存储)
   */
  public static createDefault(): AuditLogStorage {
    return this.create({ type: 'file' });
  }

  /**
   * 创建内存存储 (用于测试)
   */
  public static createMemoryStorage(maxEvents?: number): AuditLogStorage {
    return this.create({ type: 'memory', options: { maxEvents } });
  }

  /**
   * 获取默认配置
   */
  private static getDefaultConfig(): StorageConfig {
    return {
      type: 'file',
      options: {
        basePath: './logs/audit',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        compressionEnabled: true,
      },
    };
  }

  /**
   * 从环境变量创建存储
   */
  public static createFromEnv(): AuditLogStorage {
    const storageType = (process.env.AUDIT_LOG_STORAGE_TYPE as StorageType) || 'file';

    const options: Record<string, unknown> = {};

    if (storageType === 'file') {
      options.basePath = process.env.AUDIT_LOG_FILE_PATH || './logs/audit';
      options.maxFileSize = parseInt(
        process.env.AUDIT_LOG_MAX_FILE_SIZE || '104857600', // 100MB
        10
      );
      options.compressionEnabled =
        process.env.AUDIT_LOG_COMPRESSION_ENABLED !== 'false';
    } else if (storageType === 'memory') {
      options.maxEvents = parseInt(
        process.env.AUDIT_LOG_MEMORY_MAX_EVENTS || '10000',
        10
      );
    }

    return this.create({ type: storageType, options });
  }
}