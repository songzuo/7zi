/**
 * Agent 注册表 - 管理智能体发现、注册、健康检查
 */

import { EventEmitter } from 'events';
import {
  AgentInfo,
  AgentCapability,
  MultiAgentError,
  MultiAgentErrorType,
  AgentRegistryEvent,
} from './types';

export class AgentRegistry extends EventEmitter {
  private agents: Map<string, AgentInfo> = new Map();
  private capabilities: Map<string, Set<string>> = new Map(); // capability -> agent IDs
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  // 配置
  private heartbeatInterval: number;
  private heartbeatTimeout: number;
  private cleanupInterval: number;

  constructor(options?: {
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
    cleanupInterval?: number;
  }) {
    super();
    this.heartbeatInterval = options?.heartbeatInterval || 30000; // 30秒
    this.heartbeatTimeout = options?.heartbeatTimeout || 90000; // 90秒
    this.cleanupInterval = options?.cleanupInterval || 60000; // 60秒

    // 启动清理任务
    this.startCleanup();
  }

  /**
   * 注册 Agent
   */
  async register(agent: AgentInfo): Promise<void> {
    // 验证 Agent 信息
    if (!agent.id || !agent.name || !agent.capabilities) {
      throw new MultiAgentError(
        MultiAgentErrorType.VALIDATION_ERROR,
        'Invalid agent info: missing required fields'
      );
    }

    // 更新或添加 Agent
    const existing = this.agents.get(agent.id);
    const isNew = !existing;

    this.agents.set(agent.id, {
      ...agent,
      lastSeen: Date.now(),
    });

    // 更新能力索引
    if (isNew) {
      this.updateCapabilityIndex(agent.id, agent.capabilities, [] as AgentCapability[]);
    } else {
      this.updateCapabilityIndex(agent.id, agent.capabilities, existing.capabilities);
    }

    // 设置心跳监控
    this.setupHeartbeat(agent.id);

    // 发出事件
    this.emit('register', {
      type: 'register',
      agentId: agent.id,
      data: agent,
    } as AgentRegistryEvent);

    if (!isNew && existing?.status !== agent.status) {
      this.emit('status_change', {
        type: 'status_change',
        agentId: agent.id,
        data: { oldStatus: existing.status, newStatus: agent.status },
      } as AgentRegistryEvent);
    }
  }

  /**
   * 注销 Agent
   */
  async unregister(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new MultiAgentError(
        MultiAgentErrorType.AGENT_NOT_FOUND,
        `Agent ${agentId} not found`
      );
    }

    // 清除能力索引
    this.removeCapabilityIndex(agentId, agent.capabilities);

    // 清除心跳定时器
    this.clearHeartbeat(agentId);

    // 移除 Agent
    this.agents.delete(agentId);

    // 发出事件
    this.emit('unregister', {
      type: 'unregister',
      agentId,
      data: agent,
    } as AgentRegistryEvent);
  }

  /**
   * 更新心跳
   */
  async heartbeat(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new MultiAgentError(
        MultiAgentErrorType.AGENT_NOT_FOUND,
        `Agent ${agentId} not found`
      );
    }

    const oldStatus = agent.status;

    // 更新最后活跃时间
    agent.lastSeen = Date.now();

    // 如果之前是离线状态，更新为在线
    if (agent.status === 'offline') {
      agent.status = 'online';
    }

    // 重置心跳定时器
    this.setupHeartbeat(agentId);

    // 发出事件
    this.emit('heartbeat', {
      type: 'heartbeat',
      agentId,
      data: { lastSeen: agent.lastSeen },
    } as AgentRegistryEvent);

    // 状态变化时发出事件
    if (oldStatus !== agent.status) {
      this.emit('status_change', {
        type: 'status_change',
        agentId,
        data: { oldStatus, newStatus: agent.status },
      } as AgentRegistryEvent);
    }
  }

  /**
   * 获取 Agent 信息
   */
  getAgent(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 获取所有 Agent
   */
  getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /**
   * 根据 ID 批量获取 Agent
   */
  getAgentsByIds(agentIds: string[]): AgentInfo[] {
    const agents: AgentInfo[] = [];
    for (const id of agentIds) {
      const agent = this.agents.get(id);
      if (agent) {
        agents.push(agent);
      }
    }
    return agents;
  }

  /**
   * 根据能力查找 Agent
   */
  findAgentsByCapability(capabilityId: string): AgentInfo[] {
    const agentIds = this.capabilities.get(capabilityId);
    if (!agentIds) {
      return [];
    }

    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is AgentInfo => agent !== undefined);
  }

  /**
   * 根据能力列表查找 Agent（支持 AND 逻辑）
   */
  findAgentsByCapabilities(requiredCapabilities: string[]): AgentInfo[] {
    if (requiredCapabilities.length === 0) {
      return this.getAllAgents();
    }

    // 找到具备所有能力的 Agent
    const result: AgentInfo[] = [];

    for (const agent of Array.from(this.agents.values())) {
      const agentCapabilityIds = agent.capabilities.map(c => c.id);
      const hasAll = requiredCapabilities.every(cap =>
        agentCapabilityIds.includes(cap)
      );

      if (hasAll) {
        result.push(agent);
      }
    }

    return result;
  }

  /**
   * 查找最佳 Agent（基于状态和能力匹配度）
   */
  findBestAgent(
    requiredCapabilities: string[],
    excludeIds?: string[]
  ): AgentInfo | null {
    const candidates = this.findAgentsByCapabilities(requiredCapabilities);

    // 过滤掉排除的 ID 和离线的 Agent
    const filtered = candidates.filter(
      agent =>
        (!excludeIds || !excludeIds.includes(agent.id)) &&
        agent.status === 'online'
    );

    if (filtered.length === 0) {
      return null;
    }

    // 简单策略：选择负载最低的（非忙碌状态优先）
    const online = filtered.filter(a => a.status === 'online');
    if (online.length > 0) {
      return online[0]; // 简化版：返回第一个在线的
    }

    return filtered[0];
  }

  /**
   * 更新 Agent 状态
   */
  async updateStatus(
    agentId: string,
    status: 'online' | 'offline' | 'busy' | 'error'
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new MultiAgentError(
        MultiAgentErrorType.AGENT_NOT_FOUND,
        `Agent ${agentId} not found`
      );
    }

    const oldStatus = agent.status;
    agent.status = status;

    // 发出事件
    this.emit('status_change', {
      type: 'status_change',
      agentId,
      data: { oldStatus, newStatus: status },
    } as AgentRegistryEvent);
  }

  /**
   * 获取在线 Agent
   */
  getOnlineAgents(): AgentInfo[] {
    return this.getAllAgents().filter(agent => agent.status === 'online');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const agents = this.getAllAgents();
    return {
      total: agents.length,
      online: agents.filter(a => a.status === 'online').length,
      busy: agents.filter(a => a.status === 'busy').length,
      offline: agents.filter(a => a.status === 'offline').length,
      error: agents.filter(a => a.status === 'error').length,
      capabilities: this.capabilities.size,
    };
  }

  /**
   * 搜索 Agent（支持多种条件）
   */
  searchAgents(query: {
    type?: 'llm' | 'tool' | 'human' | 'composite';
    status?: 'online' | 'offline' | 'busy' | 'error';
    capability?: string;
    keyword?: string;
  }): AgentInfo[] {
    let results = this.getAllAgents();

    // 按类型过滤
    if (query.type) {
      results = results.filter(a => a.type === query.type);
    }

    // 按状态过滤
    if (query.status) {
      results = results.filter(a => a.status === query.status);
    }

    // 按能力过滤
    if (query.capability) {
      results = results.filter(a =>
        a.capabilities.some(c => c.id === query.capability)
      );
    }

    // 按关键词搜索（名称或描述）
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      results = results.filter(
        a =>
          a.name.toLowerCase().includes(keyword) ||
          a.capabilities.some(c =>
            c.name.toLowerCase().includes(keyword) ||
            c.description.toLowerCase().includes(keyword)
          )
      );
    }

    return results;
  }

  /**
   * 更新能力索引
   */
  private updateCapabilityIndex(
    agentId: string,
    newCapabilities: AgentCapability[],
    oldCapabilities: AgentCapability[]
  ): void {
    // 移除旧能力索引
    this.removeCapabilityIndex(agentId, oldCapabilities);

    // 添加新能力索引
    for (const capability of newCapabilities) {
      if (!this.capabilities.has(capability.id)) {
        this.capabilities.set(capability.id, new Set());
      }
      this.capabilities.get(capability.id)!.add(agentId);
    }
  }

  /**
   * 移除能力索引
   */
  private removeCapabilityIndex(
    agentId: string,
    capabilities: AgentCapability[]
  ): void {
    for (const capability of capabilities) {
      const agentIds = this.capabilities.get(capability.id);
      if (agentIds) {
        agentIds.delete(agentId);
        if (agentIds.size === 0) {
          this.capabilities.delete(capability.id);
        }
      }
    }
  }

  /**
   * 设置心跳监控
   */
  private setupHeartbeat(agentId: string): void {
    // 清除旧的定时器
    this.clearHeartbeat(agentId);

    // 设置新的超时定时器
    const timer = setTimeout(() => {
      this.handleHeartbeatTimeout(agentId);
    }, this.heartbeatTimeout);

    this.heartbeatTimers.set(agentId, timer);
  }

  /**
   * 清除心跳定时器
   */
  private clearHeartbeat(agentId: string): void {
    const timer = this.heartbeatTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.heartbeatTimers.delete(agentId);
    }
  }

  /**
   * 处理心跳超时
   */
  private async handleHeartbeatTimeout(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return;
    }

    // 检查最后活跃时间
    const elapsed = Date.now() - agent.lastSeen;
    if (elapsed > this.heartbeatTimeout) {
      // 标记为离线
      const oldStatus = agent.status;
      agent.status = 'offline';

      this.emit('status_change', {
        type: 'status_change',
        agentId,
        data: { oldStatus, newStatus: 'offline', reason: 'heartbeat_timeout' },
      } as AgentRegistryEvent);
    }
  }

  /**
   * 启动清理任务
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * 清理过期的 Agent
   */
  private cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    // 找出长时间未响应的 Agent（超过 5 分钟）
    for (const [id, agent] of Array.from(this.agents.entries())) {
      if (now - agent.lastSeen > 300000 && agent.status === 'offline') {
        toRemove.push(id);
      }
    }

    // 移除这些 Agent
    for (const id of toRemove) {
      this.unregister(id).catch(error => {
        this.emit('error', error);
      });
    }
  }

  /**
   * 关闭注册表
   */
  async close(): Promise<void> {
    // 清理心跳定时器
    this.heartbeatTimers.forEach(timer => clearTimeout(timer));
    this.heartbeatTimers.clear();

    // 清理清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // 清理数据
    this.agents.clear();
    this.capabilities.clear();

    // 移除所有监听器
    this.removeAllListeners();
  }
}
