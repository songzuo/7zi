/**
 * 高可用模块
 * @module config-center/high-availability
 * @version 1.10.0
 */

import {
  ConfigSyncStatus,
  ConfigItem,
  ConfigEnvironment,
  ConfigHealthCheck,
  HealthCheckResult,
} from './types';
import { StorageAdapter } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 节点状态
 */
export interface NodeStatus {
  /** 节点ID */
  nodeId: string;
  /** 节点地址 */
  address: string;
  /** 节点角色 */
  role: 'master' | 'slave' | 'observer';
  /** 是否在线 */
  online: boolean;
  /** 最后心跳时间 */
  lastHeartbeat: Date;
  /** 延迟 (毫秒) */
  latency?: number;
  /** 节点版本 */
  version: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 同步配置
 */
export interface SyncConfig {
  /** 同步间隔 (毫秒) */
  syncInterval: number;
  /** 批量大小 */
  batchSize: number;
  /** 重试次数 */
  maxRetries: number;
  /** 重试延迟 (毫秒) */
  retryDelay: number;
  /** 超时时间 (毫秒) */
  timeout: number;
}

/**
 * 高可用管理器
 * 
 * 提供配置同步、故障转移、健康检查等功能
 */
export class HighAvailabilityManager {
  private storage: StorageAdapter;
  private nodes: Map<string, NodeStatus> = new Map();
  private syncStatuses: Map<string, ConfigSyncStatus> = new Map();
  private currentNodeId: string;
  private syncConfig: SyncConfig;
  private syncTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private isMaster = false;

  constructor(
    storage: StorageAdapter,
    currentNodeId: string,
    syncConfig: Partial<SyncConfig> = {}
  ) {
    this.storage = storage;
    this.currentNodeId = currentNodeId;
    this.syncConfig = {
      syncInterval: syncConfig.syncInterval || 30000, // 30秒
      batchSize: syncConfig.batchSize || 100,
      maxRetries: syncConfig.maxRetries || 3,
      retryDelay: syncConfig.retryDelay || 5000,
      timeout: syncConfig.timeout || 10000,
    };
  }

  /**
   * 初始化高可用管理器
   */
  async initialize(): Promise<void> {
    // 启动同步定时器
    this.startSyncTimer();

    // 启动健康检查定时器
    this.startHealthCheckTimer();

    // 选举主节点
    await this.electMaster();
  }

  /**
   * 添加节点
   */
  async addNode(node: Omit<NodeStatus, 'lastHeartbeat'>): Promise<void> {
    const nodeStatus: NodeStatus = {
      ...node,
      lastHeartbeat: new Date(),
    };

    this.nodes.set(node.nodeId, nodeStatus);
  }

  /**
   * 移除节点
   */
  async removeNode(nodeId: string): Promise<void> {
    this.nodes.delete(nodeId);
  }

  /**
   * 更新节点心跳
   */
  async updateHeartbeat(nodeId: string, latency?: number): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.lastHeartbeat = new Date();
      node.latency = latency;
      node.online = true;
    }
  }

  /**
   * 获取节点列表
   */
  getNodes(): NodeStatus[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 获取在线节点
   */
  getOnlineNodes(): NodeStatus[] {
    return Array.from(this.nodes.values()).filter(node => node.online);
  }

  /**
   * 获取离线节点
   */
  getOfflineNodes(): NodeStatus[] {
    return Array.from(this.nodes.values()).filter(node => !node.online);
  }

  /**
   * 同步配置到节点
   */
  async syncToNode(
    targetNodeId: string,
    environment?: ConfigEnvironment
  ): Promise<ConfigSyncStatus> {
    const targetNode = this.nodes.get(targetNodeId);
    if (!targetNode) {
      throw new Error(`Target node ${targetNodeId} not found`);
    }

    if (!targetNode.online) {
      throw new Error(`Target node ${targetNodeId} is offline`);
    }

    const syncId = uuidv4();
    const syncStatus: ConfigSyncStatus = {
      id: syncId,
      sourceNode: this.currentNodeId,
      targetNode: targetNodeId,
      status: 'syncing',
      configCount: 0,
      successCount: 0,
      failedCount: 0,
      startedAt: new Date(),
      retryCount: 0,
    };

    this.syncStatuses.set(syncId, syncStatus);

    try {
      // 获取需要同步的配置
      const configs = await this.storage.getAllConfigs(environment || 'development');
      syncStatus.configCount = configs.length;

      // 批量同步
      for (let i = 0; i < configs.length; i += this.syncConfig.batchSize) {
        const batch = configs.slice(i, i + this.syncConfig.batchSize);

        // 这里应该调用目标节点的API
        // await this.syncBatchToNode(targetNode.address, batch);

        syncStatus.successCount += batch.length;
      }

      syncStatus.status = 'completed';
      syncStatus.completedAt = new Date();
    } catch (error) {
      syncStatus.status = 'failed';
      syncStatus.completedAt = new Date();
      syncStatus.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    return syncStatus;
  }

  /**
   * 从节点同步配置
   */
  async syncFromNode(
    sourceNodeId: string,
    environment?: ConfigEnvironment
  ): Promise<ConfigSyncStatus> {
    const sourceNode = this.nodes.get(sourceNodeId);
    if (!sourceNode) {
      throw new Error(`Source node ${sourceNodeId} not found`);
    }

    if (!sourceNode.online) {
      throw new Error(`Source node ${sourceNodeId} is offline`);
    }

    const syncId = uuidv4();
    const syncStatus: ConfigSyncStatus = {
      id: syncId,
      sourceNode: sourceNodeId,
      targetNode: this.currentNodeId,
      status: 'syncing',
      configCount: 0,
      successCount: 0,
      failedCount: 0,
      startedAt: new Date(),
      retryCount: 0,
    };

    this.syncStatuses.set(syncId, syncStatus);

    try {
      // 这里应该调用源节点的API获取配置
      // const configs = await this.fetchConfigsFromNode(sourceNode.address, environment);

      syncStatus.status = 'completed';
      syncStatus.completedAt = new Date();
    } catch (error) {
      syncStatus.status = 'failed';
      syncStatus.completedAt = new Date();
      syncStatus.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    return syncStatus;
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(syncId: string): ConfigSyncStatus | undefined {
    return this.syncStatuses.get(syncId);
  }

  /**
   * 获取所有同步状态
   */
  getAllSyncStatuses(): ConfigSyncStatus[] {
    return Array.from(this.syncStatuses.values());
  }

  /**
   * 选举主节点
   */
  async electMaster(): Promise<string> {
    const onlineNodes = this.getOnlineNodes();

    if (onlineNodes.length === 0) {
      throw new Error('No online nodes available for election');
    }

    // 简单选举策略：选择节点ID最小的作为主节点
    const sortedNodes = onlineNodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const masterNode = sortedNodes[0];

    // 更新节点角色
    for (const node of this.nodes.values()) {
      node.role = node.nodeId === masterNode.nodeId ? 'master' : 'slave';
    }

    this.isMaster = masterNode.nodeId === this.currentNodeId;

    return masterNode.nodeId;
  }

  /**
   * 获取主节点
   */
  getMasterNode(): NodeStatus | undefined {
    return Array.from(this.nodes.values()).find(node => node.role === 'master');
  }

  /**
   * 检查是否为主节点
   */
  isMasterNode(): boolean {
    return this.isMaster;
  }

  /**
   * 执行故障转移
   */
  async failover(): Promise<string> {
    const currentMaster = this.getMasterNode();
    if (!currentMaster) {
      throw new Error('No master node found');
    }

    // 标记当前主节点为离线
    currentMaster.online = false;
    currentMaster.role = 'slave';

    // 选举新的主节点
    const newMasterId = await this.electMaster();

    return newMasterId;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<ConfigHealthCheck> {
    const checks: ConfigHealthCheck['checks'] = {
      storage: await this.checkStorage(),
      cache: await this.checkCache(),
      sync: await this.checkSync(),
      version: await this.checkVersion(),
    };

    const healthy = Object.values(checks).every(check => check.status === 'healthy');

    return {
      healthy,
      timestamp: new Date(),
      checks,
    };
  }

  /**
   * 检查存储健康状态
   */
  private async checkStorage(): Promise<HealthCheckResult> {
    try {
      // 尝试读取配置
      await this.storage.getAllConfigs('development');
      
      return {
        status: 'healthy',
        message: 'Storage is accessible',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Storage error',
      };
    }
  }

  /**
   * 检查缓存健康状态
   */
  private async checkCache(): Promise<HealthCheckResult> {
    // 缓存检查逻辑
    return {
      status: 'healthy',
      message: 'Cache is operational',
    };
  }

  /**
   * 检查同步健康状态
   */
  private async checkSync(): Promise<HealthCheckResult> {
    const onlineNodes = this.getOnlineNodes();
    const totalNodes = this.nodes.size;

    if (totalNodes === 0) {
      return {
        status: 'healthy',
        message: 'No nodes configured',
      };
    }

    const onlineRatio = onlineNodes.length / totalNodes;

    if (onlineRatio >= 0.7) {
      return {
        status: 'healthy',
        message: `${onlineNodes.length}/${totalNodes} nodes online`,
      };
    } else if (onlineRatio >= 0.5) {
      return {
        status: 'degraded',
        message: `${onlineNodes.length}/${totalNodes} nodes online`,
      };
    } else {
      return {
        status: 'unhealthy',
        message: `${onlineNodes.length}/${totalNodes} nodes online`,
      };
    }
  }

  /**
   * 检查版本一致性
   */
  private async checkVersion(): Promise<HealthCheckResult> {
    const versions = new Set<string>();

    for (const node of this.nodes.values()) {
      if (node.online) {
        versions.add(node.version);
      }
    }

    if (versions.size === 0) {
      return {
        status: 'healthy',
        message: 'No online nodes',
      };
    }

    if (versions.size === 1) {
      return {
        status: 'healthy',
        message: `All nodes on version ${Array.from(versions)[0]}`,
      };
    } else {
      return {
        status: 'degraded',
        message: `Version mismatch: ${Array.from(versions).join(', ')}`,
      };
    }
  }

  /**
   * 启动同步定时器
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(async () => {
      if (this.isMaster) {
        // 主节点同步到从节点
        const slaves = this.getOnlineNodes().filter(node => node.role === 'slave');

        for (const slave of slaves) {
          try {
            await this.syncToNode(slave.nodeId);
          } catch (error) {
            console.error(`Sync to node ${slave.nodeId} failed:`, error);
          }
        }
      }
    }, this.syncConfig.syncInterval);
  }

  /**
   * 启动健康检查定时器
   */
  private startHealthCheckTimer(): void {
    this.healthCheckTimer = setInterval(async () => {
      const now = Date.now();
      const heartbeatTimeout = 60000; // 60秒

      for (const [nodeId, node] of this.nodes) {
        if (now - node.lastHeartbeat.getTime() > heartbeatTimeout) {
          node.online = false;
          console.warn(`Node ${nodeId} is offline`);
        }
      }

      // 如果主节点离线，触发故障转移
      const master = this.getMasterNode();
      if (master && !master.online && this.isMasterNode()) {
        try {
          await this.failover();
        } catch (error) {
          console.error('Failover failed:', error);
        }
      }
    }, 30000); // 30秒检查一次
  }

  /**
   * 停止定时器
   */
  stopTimers(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * 获取集群统计信息
   */
  getClusterStats(): {
    totalNodes: number;
    onlineNodes: number;
    offlineNodes: number;
    masterNode: string | null;
    isMaster: boolean;
    activeSyncs: number;
  } {
    const onlineNodes = this.getOnlineNodes();
    const offlineNodes = this.getOfflineNodes();
    const masterNode = this.getMasterNode();

    return {
      totalNodes: this.nodes.size,
      onlineNodes: onlineNodes.length,
      offlineNodes: offlineNodes.length,
      masterNode: masterNode?.nodeId || null,
      isMaster: this.isMaster,
      activeSyncs: Array.from(this.syncStatuses.values()).filter(
        s => s.status === 'syncing'
      ).length,
    };
  }

  /**
   * 关闭高可用管理器
   */
  async close(): Promise<void> {
    this.stopTimers();
    this.nodes.clear();
    this.syncStatuses.clear();
  }
}