/**
 * Agent Registry - 管理所有注册的智能体
 */

import { EventEmitter } from 'events';

export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy';
  currentLoad: number; // 0-1
  metadata?: Record<string, unknown>;
}

export interface AgentFilter {
  capabilities?: string[];
  status?: Agent['status'];
  maxLoad?: number;
}

export class AgentRegistry extends EventEmitter {
  private agents: Map<string, Agent> = new Map();

  /**
   * 注册新的智能体
   */
  register(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.emit('agent:registered', agent);
  }

  /**
   * 注销智能体
   */
  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.emit('agent:unregistered', agent);
      return true;
    }
    return false;
  }

  /**
   * 获取智能体
   */
  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 获取所有智能体
   */
  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 根据条件筛选智能体
   */
  filter(filter: AgentFilter): Agent[] {
    return this.getAll().filter(agent => {
      if (filter.status && agent.status !== filter.status) {
        return false;
      }
      if (filter.maxLoad && agent.currentLoad > filter.maxLoad) {
        return false;
      }
      if (filter.capabilities && filter.capabilities.length > 0) {
        const hasAllCapabilities = filter.capabilities.every(cap =>
          agent.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 更新智能体状态
   */
  updateStatus(agentId: string, status: Agent['status']): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      const oldStatus = agent.status;
      agent.status = status;
      this.emit('agent:status:changed', agent, oldStatus);
      return true;
    }
    return false;
  }

  /**
   * 更新智能体负载
   */
  updateLoad(agentId: string, load: number): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      const oldLoad = agent.currentLoad;
      agent.currentLoad = Math.max(0, Math.min(1, load));
      this.emit('agent:load:changed', agent, oldLoad);
      return true;
    }
    return false;
  }

  /**
   * 获取在线智能体数量
   */
  getOnlineCount(): number {
    return this.getAll().filter(a => a.status === 'online').length;
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.agents.clear();
    this.emit('registry:cleared');
  }
}