'use client';

/**
 * AgentStatusPanel.tsx
 * Dashboard component for displaying real-time status of all AI Agents
 * Features:
 * - Real-time status display (available/busy/offline)
 * - Current load visualization (0-100%)
 * - Capability radar charts
 * - Role-based filtering
 * - Responsive design
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Activity,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSchedulerStore, selectAgentAvailability } from '../stores/scheduler-store';
import type { AgentCapability, TaskType } from '../models/agent-capability';
import type { Task, TaskStatus } from '../models/task-model';

/**
 * Agent display data structure
 */
interface AgentDisplay {
  id: string;
  name: string;
  emoji: string;
  role: string;
  provider: string;
  status: 'available' | 'busy' | 'offline';
  currentLoad: number;
  capabilities: {
    techStack: string[];
    taskTypes: string[];
    concurrency: number;
    successRate: number;
  };
  activeTasks: number;
  avgResponseTime: number;
}

/**
 * Agent emoji mapping
 */
const AGENT_EMOJIS: Record<string, string> = {
  'agent-expert': '🌟',
  'consultant': '📚',
  'architect': '🏗️',
  'executor': '⚡',
  'sysadmin': '🛡️',
  'tester': '🧪',
  'designer': '🎨',
  'promoter': '📣',
  'sales': '💼',
  'finance': '💰',
  'media': '📺',
};

/**
 * Role filter options
 */
const ROLE_FILTERS = [
  { value: 'all', label: '全部角色' },
  { value: 'architecture', label: '架构师' },
  { value: 'implementation', label: '执行者' },
  { value: 'testing', label: '测试员' },
  { value: 'design', label: '设计师' },
  { value: 'devops', label: '系统管理员' },
  { value: 'research', label: '咨询师' },
  { value: 'marketing', label: '推广专员' },
  { value: 'sales', label: '销售客服' },
  { value: 'finance', label: '财务' },
  { value: 'media', label: '媒体' },
];

/**
 * Transform AgentCapability to AgentDisplay
 */
function transformToDisplay(agent: AgentCapability, tasks: Task[]): AgentDisplay {
  const activeTaskCount = tasks.filter(
    t => t.assignedAgent === agent.agentId && t.status === 'in_progress'
  ).length;

  return {
    id: agent.agentId,
    name: agent.name,
    emoji: AGENT_EMOJIS[agent.agentId] || '🤖',
    role: agent.role,
    provider: agent.provider,
    status: !agent.availability ? 'offline' : agent.currentLoad > 80 ? 'busy' : 'available',
    currentLoad: agent.currentLoad,
    capabilities: {
      techStack: agent.capabilities.techStack,
      taskTypes: agent.capabilities.taskTypes,
      concurrency: agent.capabilities.concurrency,
      successRate: agent.capabilities.successRate,
    },
    activeTasks: activeTaskCount,
    avgResponseTime: agent.capabilities.avgResponseTime,
  };
}

/**
 * Capability radar chart data generator
 */
function generateRadarData(agent: AgentDisplay) {
  return [
    { subject: '并发能力', value: agent.capabilities.concurrency * 20, fullMark: 100 },
    { subject: '成功率', value: agent.capabilities.successRate * 100, fullMark: 100 },
    { subject: '响应速度', value: 100 - agent.avgResponseTime, fullMark: 100 },
    { subject: '技术栈', value: agent.capabilities.techStack.length * 10, fullMark: 100 },
    { subject: '任务类型', value: agent.capabilities.taskTypes.length * 15, fullMark: 100 },
    { subject: '负载均衡', value: 100 - agent.currentLoad, fullMark: 100 },
  ];
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: 'available' | 'busy' | 'offline' }) {
  const config = {
    available: { color: 'bg-green-500', label: '可用', icon: CheckCircle },
    busy: { color: 'bg-yellow-500', label: '忙碌', icon: Clock },
    offline: { color: 'bg-red-500', label: '离线', icon: AlertCircle },
  };

  const { color, label, icon: Icon } = config[status];

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${color} animate-pulse`} />
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <Icon className="w-3.5 h-3.5 text-gray-500" />
    </div>
  );
}

/**
 * Load progress bar component
 */
function LoadBar({ load }: { load: number }) {
  const getColor = (load: number) => {
    if (load < 50) return 'bg-green-500';
    if (load < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-600">当前负载</span>
        <span className="text-xs font-bold text-gray-700">{load}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${getColor(load)}`}
          style={{ width: `${Math.min(load, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Agent card component
 */
function AgentCard({
  agent,
  isExpanded,
  onToggle,
}: {
  agent: AgentDisplay;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const radarData = generateRadarData(agent);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-2xl border-2 border-white shadow-sm">
              {agent.emoji}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{agent.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{agent.role}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                提供商: <span className="font-medium text-gray-600">{agent.provider}</span>
              </p>
            </div>
          </div>
          <StatusIndicator status={agent.status} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Load bar */}
        <LoadBar load={agent.currentLoad} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-blue-600 mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">活跃任务</span>
            </div>
            <p className="text-xl font-bold text-blue-700">{agent.activeTasks}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-purple-600 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">响应时间</span>
            </div>
            <p className="text-xl font-bold text-purple-700">{agent.avgResponseTime}s</p>
          </div>
        </div>

        {/* Tech stack */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">技术栈</p>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.techStack.slice(0, 4).map((tech, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
              >
                {tech}
              </span>
            ))}
            {agent.capabilities.techStack.length > 4 && (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-medium">
                +{agent.capabilities.techStack.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Radar chart toggle */}
        <button
          onClick={onToggle}
          className="w-full mt-2 flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          {isExpanded ? '收起能力图' : '查看能力图'}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Radar chart (expandable) */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">能力雷达图</p>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Radar
                  name={agent.name}
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: any) => `${(Number(value) ?? 0).toFixed(1)}%`}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Statistics summary component
 */
function StatisticsSummary() {
  const agents = useSchedulerStore(state => state.agents);
  const availability = selectAgentAvailability(useSchedulerStore.getState());

  const statusCounts = agents.reduce(
    (acc, agent) => {
      const status = !agent.availability ? 'offline' : agent.currentLoad > 80 ? 'busy' : 'available';
      acc[status]++;
      return acc;
    },
    { available: 0, busy: 0, offline: 0 }
  );

  const avgLoad =
    agents.length > 0 ? agents.reduce((sum, a) => sum + a.currentLoad, 0) / agents.length : 0;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Users className="w-6 h-6" />
        Agent 状态总览
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <p className="text-sm opacity-90">总 Agent 数</p>
          <p className="text-3xl font-bold">{availability.total}</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <p className="text-sm opacity-90">可用</p>
          <p className="text-3xl font-bold text-green-300">{statusCounts.available}</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <p className="text-sm opacity-90">忙碌</p>
          <p className="text-3xl font-bold text-yellow-300">{statusCounts.busy}</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <p className="text-sm opacity-90">平均负载</p>
          <p className="text-3xl font-bold">{avgLoad.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Main AgentStatusPanel component
 */
export function AgentStatusPanel() {
  const agents = useSchedulerStore(state => state.agents);
  const tasks = useSchedulerStore(state => state.tasks);
  const isLoading = useSchedulerStore(state => state.isLoading);
  const initialize = useSchedulerStore(state => state.initialize);
  const refresh = useSchedulerStore(state => state.refresh);

  const [selectedFilter, setSelectedFilter] = useState<TaskType | 'all'>('all');
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [refresh]);

  // Transform and filter agents
  const displayAgents = agents
    .map(agent => transformToDisplay(agent, tasks))
    .filter(agent => {
      if (selectedFilter === 'all') return true;
      return agent.capabilities.taskTypes.includes(selectedFilter as any);
    })
    .sort((a, b) => {
      // Sort by status: available > busy > offline
      const statusOrder = { available: 0, busy: 1, offline: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

  // Toggle agent expansion
  const toggleExpansion = useCallback((agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refresh]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600" />
            Agent 状态面板
          </h1>
          <p className="text-sm text-gray-500 mt-1">实时监控所有 AI Agent 的运行状态</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedFilter}
              onChange={e => setSelectedFilter(e.target.value as "all" | TaskType)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {ROLE_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* Statistics summary */}
      <StatisticsSummary />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600 font-medium">加载中...</span>
        </div>
      )}

      {/* Agent grid */}
      {!isLoading && displayAgents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isExpanded={expandedAgents.has(agent.id)}
              onToggle={() => toggleExpansion(agent.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && displayAgents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">没有找到匹配的 Agent</p>
          <p className="text-sm text-gray-500 mt-1">请尝试调整筛选条件</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-500">
        <p>
          最后更新: {new Date().toLocaleString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
}

export default AgentStatusPanel;
