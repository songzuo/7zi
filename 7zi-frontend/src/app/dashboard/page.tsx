'use client';

/**
 * Dashboard 页面 - AI Agent 调度监控面板
 * 
 * @version 1.5.0
 * @date 2026-03-30
 */

import React, { useState, useCallback } from 'react';
import { AgentStatusPanel, Agent } from './AgentStatusPanel';

// ============================================
// Mock 数据
// ============================================

const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: '设计师',
    type: 'designer',
    status: 'active',
    description: 'UI/UX 设计专家，负责前端界面设计',
    currentTask: {
      id: 'task-1',
      title: '设计 Dashboard 界面',
      type: 'design',
      status: 'running',
      progress: 65,
      startedAt: '2026-03-30T10:00:00Z',
    },
    resourceUsage: {
      cpu: 45,
      memory: 60,
    },
    lastActiveAt: new Date().toISOString(),
    enabled: true,
  },
  {
    id: 'agent-2',
    name: '开发者',
    type: 'developer',
    status: 'active',
    description: '全栈开发工程师，负责系统实现',
    currentTask: {
      id: 'task-2',
      title: '实现 Agent 调度系统',
      type: 'development',
      status: 'running',
      progress: 80,
      startedAt: '2026-03-30T09:30:00Z',
    },
    resourceUsage: {
      cpu: 75,
      memory: 55,
    },
    lastActiveAt: new Date().toISOString(),
    enabled: true,
  },
  {
    id: 'agent-3',
    name: '测试员',
    type: 'tester',
    status: 'idle',
    description: '质量保证专家，负责系统测试',
    resourceUsage: {
      cpu: 15,
      memory: 30,
    },
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
    enabled: true,
  },
  {
    id: 'agent-4',
    name: '架构师',
    type: 'manager',
    status: 'idle',
    description: '系统架构师，负责技术选型和设计',
    resourceUsage: {
      cpu: 10,
      memory: 25,
    },
    lastActiveAt: new Date(Date.now() - 7200000).toISOString(),
    enabled: true,
  },
  {
    id: 'agent-5',
    name: '运维工程师',
    type: 'custom',
    status: 'offline',
    description: 'DevOps 工程师，负责系统部署和运维',
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
    enabled: false,
  },
  {
    id: 'agent-6',
    name: '数据分析师',
    type: 'custom',
    status: 'active',
    description: '数据科学家，负责数据分析和可视化',
    currentTask: {
      id: 'task-3',
      title: '分析用户行为数据',
      type: 'analysis',
      status: 'running',
      progress: 30,
      startedAt: '2026-03-30T11:00:00Z',
    },
    resourceUsage: {
      cpu: 85,
      memory: 90,
    },
    lastActiveAt: new Date().toISOString(),
    enabled: true,
  },
  {
    id: 'agent-7',
    name: '内容编辑',
    type: 'custom',
    status: 'error',
    description: '内容创作者，负责文案撰写',
    lastActiveAt: new Date(Date.now() - 1800000).toISOString(),
    enabled: true,
  },
];

// ============================================
// Dashboard 页面组件
// ============================================

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);

  const handleRefresh = useCallback(() => {
    console.log('[Dashboard] 刷新 Agent 状态...');
    // 模拟刷新
  }, []);

  const handleViewDetails = useCallback((agent: Agent) => {
    console.log('[Dashboard] 查看 Agent 详情:', agent);
    alert(`查看 Agent 详情: ${agent.name}\n\n${JSON.stringify(agent, null, 2)}`);
  }, []);

  const handleToggleAgent = useCallback((agentId: string, enabled: boolean) => {
    console.log('[Dashboard] 切换 Agent 状态:', agentId, enabled);
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, enabled } 
        : agent
    ));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            AI Agent 调度 Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            v1.5.0 - 实时监控和管理您的 AI Agent 团队
          </p>
        </div>

        {/* Agent 状态面板 */}
        <AgentStatusPanel
          agents={agents}
          showResourceDetails={true}
          refreshInterval={60000} // 每分钟自动刷新
          onRefresh={handleRefresh}
          onViewDetails={handleViewDetails}
          onToggleAgent={handleToggleAgent}
        />
      </div>
    </div>
  );
}
