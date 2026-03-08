/**
 * Evomap 网关集成
 *
 * 连接知识晶格系统和 Evomap 协作进化市场
 */

import { KnowledgeLattice, LatticeNode, KnowledgeType, KnowledgeSource } from './knowledge-lattice';

// ============== 类型定义 ==============

/**
 * Evomap 节点配置
 */
export interface EvomapNodeConfig {
  hubUrl: string;
  nodeId?: string;
  nodeSecret?: string;
  agentName: string;
  agentType: string;
}

/**
 * 知识胶囊
 */
export interface KnowledgeCapsule {
  nodeId: string;
  content: string;
  type: KnowledgeType;
  version: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

/**
 * Evomap 注册响应
 */
export interface EvomapRegistrationResponse {
  nodeId: string;
  claimCode: string;
  secret: string;
}

/**
 * Evomap 心跳响应
 */
export interface EvomapHeartbeatResponse {
  status: 'ok' | 'error';
  reputation?: number;
  tasks?: number;
}

/**
 * Evomap 发布响应
 */
export interface EvomapPublishResponse {
  capsuleId: string;
  status: 'published' | 'queued';
}

// ============== Evomap 网关类 ==============

/**
 * Evomap 网关类
 */
export class EvomapGateway {
  private config: EvomapNodeConfig;
  private lattice: KnowledgeLattice;
  private heartbeatInterval?: NodeJS.Timeout;
  private isRegistered: boolean = false;

  constructor(config: EvomapNodeConfig, lattice: KnowledgeLattice) {
    this.config = config;
    this.lattice = lattice;

    // 加载持久化的节点信息
    this.loadNodeInfo();
  }

  // ============== 节点注册 ==============

  /**
   * 注册节点到 Evomap Hub
   */
  async register(): Promise<EvomapRegistrationResponse> {
    try {
      const payload = {
        action: 'register',
        timestamp: Date.now(),
        data: {
          agentName: this.config.agentName,
          agentType: this.config.agentType,
          capabilities: ['knowledge-lattice', 'semantic-reasoning'],
        },
      };

      const response = await this.fetch('/api/hello', payload);

      if (!response.ok) {
        throw new Error('Failed to register with Evomap Hub');
      }

      const result: EvomapRegistrationResponse = await response.json();

      // 保存节点信息
      this.config.nodeId = result.nodeId;
      this.config.nodeSecret = result.secret;
      this.saveNodeInfo();

      this.isRegistered = true;

      // 启动心跳
      this.startHeartbeat();

      return result;
    } catch (error) {
      console.error('Evomap registration error:', error);
      throw error;
    }
  }

  /**
   * 发送心跳
   */
  async heartbeat(): Promise<EvomapHeartbeatResponse> {
    if (!this.isRegistered || !this.config.nodeId) {
      throw new Error('Node not registered');
    }

    try {
      const stats = this.lattice.getStats();

      const payload = {
        action: 'heartbeat',
        nodeId: this.config.nodeId,
        timestamp: Date.now(),
        data: {
          status: 'active',
          knowledgeCount: stats.totalNodes,
          lastUpdate: Date.now(),
        },
      };

      const response = await this.fetch('/api/heartbeat', payload);

      if (!response.ok) {
        throw new Error('Heartbeat failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Evomap heartbeat error:', error);
      throw error;
    }
  }

  // ============== 知识发布 ==============

  /**
   * 发布知识胶囊到 Evomap
   */
  async publishCapsule(node: LatticeNode): Promise<EvomapPublishResponse> {
    if (!this.isRegistered || !this.config.nodeId) {
      throw new Error('Node not registered');
    }

    try {
      const capsule: KnowledgeCapsule = {
        nodeId: this.config.nodeId,
        content: node.content,
        type: node.type,
        version: '1.0.0',
        timestamp: node.timestamp,
        metadata: node.metadata,
        embedding: node.embedding,
      };

      const payload = {
        action: 'publish',
        nodeId: this.config.nodeId,
        timestamp: Date.now(),
        data: {
          type: 'knowledge-capsule',
          capsule,
        },
      };

      const response = await this.fetch('/api/publish', payload);

      if (!response.ok) {
        throw new Error('Failed to publish capsule');
      }

      return await response.json();
    } catch (error) {
      console.error('Evomap publish error:', error);
      throw error;
    }
  }

  /**
   * 发布整个晶格到 Evomap
   */
  async publishLattice(): Promise<EvomapPublishResponse[]> {
    const nodes = this.lattice.getAllNodes();
    const results: EvomapPublishResponse[] = [];

    for (const node of nodes) {
      try {
        const result = await this.publishCapsule(node);
        results.push(result);
      } catch (error) {
        console.error(`Failed to publish node ${node.id}:`, error);
        results.push({
          capsuleId: node.id,
          status: 'error' as const,
        });
      }
    }

    return results;
  }

  // ============== 知识获取 ==============

  /**
   * 从 Evomap 获取知识胶囊
   */
  async fetchCapsules(filters?: {
    type?: KnowledgeType;
    source?: string;
    limit?: number;
  }): Promise<KnowledgeCapsule[]> {
    if (!this.isRegistered || !this.config.nodeId) {
      throw new Error('Node not registered');
    }

    try {
      const payload = {
        action: 'fetch',
        nodeId: this.config.nodeId,
        timestamp: Date.now(),
        data: {
          type: 'knowledge-capsules',
          filters,
        },
      };

      const response = await this.fetch('/api/fetch', payload);

      if (!response.ok) {
        throw new Error('Failed to fetch capsules');
      }

      return await response.json();
    } catch (error) {
      console.error('Evomap fetch error:', error);
      throw error;
    }
  }

  /**
   * 获取并导入知识胶囊到本地晶格
   */
  async importCapsules(filters?: {
    type?: KnowledgeType;
    source?: string;
    limit?: number;
  }): Promise<LatticeNode[]> {
    const capsules = await this.fetchCapsules(filters);
    const importedNodes: LatticeNode[] = [];

    for (const capsule of capsules) {
      // 检查是否已存在（根据内容和时间戳）
      const existing = this.lattice.getAllNodes().find(
        n => n.content === capsule.content && n.timestamp === capsule.timestamp
      );

      if (!existing) {
        const node: LatticeNode = {
          id: `evomap_${capsule.nodeId}_${capsule.timestamp}`,
          content: capsule.content,
          type: capsule.type,
          weight: 0.5,
          confidence: 0.5,
          timestamp: capsule.timestamp,
          source: KnowledgeSource.EVOMAP,
          embedding: capsule.embedding,
          metadata: {
            ...capsule.metadata,
            evomapNodeId: capsule.nodeId,
          },
        };

        this.lattice.addNode(node);
        importedNodes.push(node);
      }
    }

    return importedNodes;
  }

  // ============== 任务系统 ==============

  /**
   * 获取可用任务
   */
  async fetchTasks(): Promise<unknown[]> {
    if (!this.isRegistered || !this.config.nodeId) {
      throw new Error('Node not registered');
    }

    try {
      const payload = {
        action: 'fetch',
        nodeId: this.config.nodeId,
        timestamp: Date.now(),
        data: {
          type: 'tasks',
        },
      };

      const response = await this.fetch('/api/fetch', payload);

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      return await response.json();
    } catch (error) {
      console.error('Evomap fetch tasks error:', error);
      throw error;
    }
  }

  /**
   * 领取任务
   */
  async claimTask(taskId: string): Promise<unknown> {
    if (!this.isRegistered || !this.config.nodeId) {
      throw new Error('Node not registered');
    }

    try {
      const payload = {
        action: 'claim',
        nodeId: this.config.nodeId,
        timestamp: Date.now(),
        data: {
          taskId,
        },
      };

      const response = await this.fetch('/api/claim', payload);

      if (!response.ok) {
        throw new Error('Failed to claim task');
      }

      return await response.json();
    } catch (error) {
      console.error('Evomap claim task error:', error);
      throw error;
    }
  }

  /**
   * 提交任务结果
   */
  async submitTask(taskId: string, result: unknown): Promise<unknown> {
    if (!this.isRegistered || !this.config.nodeId) {
      throw new Error('Node not registered');
    }

    try {
      const payload = {
        action: 'submit',
        nodeId: this.config.nodeId,
        timestamp: Date.now(),
        data: {
          taskId,
          result,
        },
      };

      const response = await this.fetch('/api/submit', payload);

      if (!response.ok) {
        throw new Error('Failed to submit task');
      }

      return await response.json();
    } catch (error) {
      console.error('Evomap submit task error:', error);
      throw error;
    }
  }

  // ============== 状态查询 ==============

  /**
   * 查询节点状态
   */
  async getNodeStatus(): Promise<unknown> {
    if (!this.isRegistered || !this.config.nodeId) {
      throw new Error('Node not registered');
    }

    try {
      const payload = {
        action: 'status',
        nodeId: this.config.nodeId,
        timestamp: Date.now(),
      };

      const response = await this.fetch('/api/status', payload);

      if (!response.ok) {
        throw new Error('Failed to get node status');
      }

      return await response.json();
    } catch (error) {
      console.error('Evomap status error:', error);
      throw error;
    }
  }

  // ============== 工具方法 ==============

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    // 每 5 分钟发送一次心跳
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.heartbeat();
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 停止心跳
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * 获取节点信息
   */
  private loadNodeInfo(): void {
    try {
      const stored = localStorage.getItem('evomap_node_info');
      if (stored) {
        const info = JSON.parse(stored);
        this.config.nodeId = info.nodeId;
        this.config.nodeSecret = info.nodeSecret;
        this.isRegistered = true;
      }
    } catch (error) {
      console.error('Failed to load node info:', error);
    }
  }

  /**
   * 保存节点信息
   */
  private saveNodeInfo(): void {
    try {
      const info = {
        nodeId: this.config.nodeId,
        nodeSecret: this.config.nodeSecret,
      };
      localStorage.setItem('evomap_node_info', JSON.stringify(info));
    } catch (error) {
      console.error('Failed to save node info:', error);
    }
  }

  /**
   * HTTP 请求
   */
  private async fetch(path: string, payload: Record<string, unknown>): Promise<Response> {
    const url = `${this.config.hubUrl}${path}`;

    // 添加签名（简化版）
    if (this.config.nodeSecret) {
      payload.signature = this.signPayload(payload);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response;
  }

  /**
   * 签名负载（简化版）
   */
  private signPayload(payload: Record<string, unknown>): string {
    // 实际实现应该使用 HMAC-SHA256
    const data = JSON.stringify(payload);
    const secret = this.config.nodeSecret || '';
    return Buffer.from(data + secret).toString('base64');
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.isRegistered = false;
  }
}

// ============== 导出 ==============

export default EvomapGateway;