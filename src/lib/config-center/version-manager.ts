/**
 * 版本管理器
 * @module config-center/version-manager
 * @version 1.10.0
 */

import {
  ConfigItem,
  ConfigVersion,
  ConfigChangeAction,
} from './types';
import { StorageAdapter } from './types';

/**
 * 版本管理器
 * 
 * 提供配置版本管理、历史追踪、回滚等功能
 */
export class VersionManager {
  private storage: StorageAdapter;
  private maxVersions: number;
  private initialized = false;

  constructor(storage: StorageAdapter, maxVersions: number = 100) {
    this.storage = storage;
    this.maxVersions = maxVersions;
  }

  /**
   * 初始化版本管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
  }

  /**
   * 创建新版本
   */
  async createVersion(
    config: ConfigItem,
    action: ConfigChangeAction,
    userId: string,
    options: {
      changeDescription?: string;
      isRollback?: boolean;
      rollbackFrom?: number;
    } = {}
  ): Promise<ConfigVersion> {
    const version: ConfigVersion = {
      version: config.version,
      configId: config.id,
      key: config.key,
      value: config.value,
      changeDescription: options.changeDescription,
      changeAction: action,
      changedBy: userId,
      changedAt: new Date(),
      isRollback: options.isRollback,
      rollbackFrom: options.rollbackFrom,
    };

    // 保存版本记录
    await this.saveVersion(version);

    // 清理旧版本
    await this.cleanupOldVersions(config.id);

    return version;
  }

  /**
   * 获取版本历史
   */
  async getVersionHistory(
    configId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ConfigVersion[]> {
    const { limit = 50, offset = 0 } = options;
    
    // 从存储获取版本历史
    const versions = await this.getVersions(configId);
    
    // 按版本号倒序排序
    versions.sort((a, b) => b.version - a.version);
    
    // 分页
    return versions.slice(offset, offset + limit);
  }

  /**
   * 获取特定版本
   */
  async getVersion(configId: string, version: number): Promise<ConfigVersion | null> {
    const versions = await this.getVersions(configId);
    return versions.find(v => v.version === version) || null;
  }

  /**
   * 获取最新版本
   */
  async getLatestVersion(configId: string): Promise<ConfigVersion | null> {
    const versions = await this.getVersions(configId);
    if (versions.length === 0) {
      return null;
    }
    
    versions.sort((a, b) => b.version - a.version);
    return versions[0];
  }

  /**
   * 回滚到指定版本
   */
  async rollback(
    configId: string,
    targetVersion: number,
    userId: string
  ): Promise<ConfigVersion> {
    // 获取目标版本
    const targetVer = await this.getVersion(configId, targetVersion);
    if (!targetVer) {
      throw new Error(`Version ${targetVersion} not found for config ${configId}`);
    }

    // 获取当前最新版本
    const currentVersion = await this.getLatestVersion(configId);
    if (!currentVersion) {
      throw new Error(`No current version found for config ${configId}`);
    }

    // 创建回滚版本
    const rollbackVersion: ConfigVersion = {
      version: currentVersion.version + 1,
      configId,
      key: targetVer.key,
      value: targetVer.value,
      changeDescription: `Rollback to version ${targetVersion}`,
      changeAction: 'rollback',
      changedBy: userId,
      changedAt: new Date(),
      isRollback: true,
      rollbackFrom: currentVersion.version,
    };

    // 保存回滚版本
    await this.saveVersion(rollbackVersion);

    return rollbackVersion;
  }

  /**
   * 比较两个版本
   */
  async compareVersions(
    configId: string,
    version1: number,
    version2: number
  ): Promise<{
    version1: ConfigVersion;
    version2: ConfigVersion;
    diff: {
      valueChanged: boolean;
      oldValue: unknown;
      newValue: unknown;
    };
  }> {
    const v1 = await this.getVersion(configId, version1);
    const v2 = await this.getVersion(configId, version2);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    return {
      version1: v1,
      version2: v2,
      diff: {
        valueChanged: v1.value !== v2.value,
        oldValue: v1.value,
        newValue: v2.value,
      },
    };
  }

  /**
   * 获取版本统计
   */
  async getVersionStats(configId: string): Promise<{
    totalVersions: number;
    firstVersion: ConfigVersion | null;
    latestVersion: ConfigVersion | null;
    rollbackCount: number;
    updateCount: number;
    createCount: number;
    deleteCount: number;
  }> {
    const versions = await this.getVersions(configId);
    
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        firstVersion: null,
        latestVersion: null,
        rollbackCount: 0,
        updateCount: 0,
        createCount: 0,
        deleteCount: 0,
      };
    }

    versions.sort((a, b) => a.version - b.version);

    return {
      totalVersions: versions.length,
      firstVersion: versions[0],
      latestVersion: versions[versions.length - 1],
      rollbackCount: versions.filter(v => v.isRollback).length,
      updateCount: versions.filter(v => v.changeAction === 'update').length,
      createCount: versions.filter(v => v.changeAction === 'create').length,
      deleteCount: versions.filter(v => v.changeAction === 'delete').length,
    };
  }

  /**
   * 清理旧版本
   */
  private async cleanupOldVersions(configId: string): Promise<void> {
    const versions = await this.getVersions(configId);
    
    if (versions.length > this.maxVersions) {
      // 按版本号排序
      versions.sort((a, b) => b.version - a.version);
      
      // 删除超出限制的旧版本
      const toDelete = versions.slice(this.maxVersions);
      
      for (const version of toDelete) {
        await this.deleteVersion(version);
      }
    }
  }

  /**
   * 保存版本 (需要存储适配器支持)
   */
  private async saveVersion(version: ConfigVersion): Promise<void> {
    // 这里需要存储适配器支持版本存储
    // 实际实现会根据存储适配器的接口而定
    const versions = await this.getVersions(version.configId);
    versions.push(version);
    
    // 存储到持久化层
    // await this.storage.saveVersion(version);
    
    // 临时使用内存存储 (实际应使用持久化存储)
    this.versionStore.set(version.configId, versions);
  }

  /**
   * 获取版本列表
   */
  private async getVersions(configId: string): Promise<ConfigVersion[]> {
    // 临时使用内存存储 (实际应使用持久化存储)
    return this.versionStore.get(configId) || [];
  }

  /**
   * 删除版本
   */
  private async deleteVersion(version: ConfigVersion): Promise<void> {
    const versions = await this.getVersions(version.configId);
    const index = versions.findIndex(v => v.version === version.version);
    
    if (index !== -1) {
      versions.splice(index, 1);
      this.versionStore.set(version.configId, versions);
    }
  }

  // 临时内存存储 (实际应使用持久化存储)
  private versionStore: Map<string, ConfigVersion[]> = new Map();

  /**
   * 批量获取版本历史
   */
  async getBatchVersionHistory(
    configIds: string[],
    options: {
      limit?: number;
    } = {}
  ): Promise<Map<string, ConfigVersion[]>> {
    const result = new Map<string, ConfigVersion[]>();
    
    for (const configId of configIds) {
      const versions = await this.getVersionHistory(configId, options);
      result.set(configId, versions);
    }
    
    return result;
  }

  /**
   * 导出版本历史
   */
  async exportVersionHistory(
    configId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const versions = await this.getVersions(configId);
    
    if (format === 'json') {
      return JSON.stringify(versions, null, 2);
    }
    
    // CSV 格式
    const headers = 'version,key,action,changedBy,changedAt,description\n';
    const rows = versions
      .sort((a, b) => b.version - a.version)
      .map(
        v =>
          `${v.version},${v.key},${v.changeAction},${v.changedBy},${v.changedAt.toISOString()},${v.changeDescription || ''}`
      )
      .join('\n');
    
    return headers + rows;
  }
}
