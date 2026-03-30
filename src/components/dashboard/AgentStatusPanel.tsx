'use client';

/**
 * AgentStatusPanel - AI Agent 状态面板组件
 *
 * 显示所有 Agent 的实时状态（idle/busy/offline/error）
 * 支持状态筛选、任务详情、自动刷新
 * 使用 Zustand 进行状态管理
 * @module components/dashboard/AgentStatusPanel
 */

import { FC, useEffect, useMemo, useState } from 'react';
import { 
  Bot, 
  Clock, 
  Activity, 
  Cpu, 
  AlertCircle,
  MoreVertical,
  RefreshCw,
  Filter,
  HardDrive,
  Server
} from 'lucide-react';
import { useSchedulerStore, selectAgents, selectAgentAvailability, selectTasks } from '@/lib/agents/scheduler/stores/scheduler-store';
import type { AgentCapability, AgentProvider } from '@/lib/agents/scheduler/models/agent-capability';
import type { Task } from '@/lib/agents/scheduler/models/task-model';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Agent 状态类型
 */
export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error';

/**
 * 状态筛选选项
 */
export type StatusFilter = 'all' | 'idle' | 'busy' | 'offline' | 'error';

/**
 * Agent 系统资源使用率
 */
interface SystemResource {
  /** CPU 使用率 (%) */
  cpuUsage: number;
  /** 内存使用率 (%) */
  memoryUsage: number;
}

/**
 * 扩展 Agent 信息（包含当前任务和资源）
 */
interface ExtendedAgentInfo {
  /** Agent 基础信息 */
  agent: AgentCapability;
  /** Agent 状态 */
  status: AgentStatus;
  /** 当前任务 */
  currentTask: Task | null;
  /** 系统资源 */
  resources: SystemResource;
}

export interface AgentStatusPanelProps {
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 是否显示详细指标 */
  showMetrics?: boolean;
  /** 是否自动刷新 */
  autoRefresh?: boolean;
  /** 自动刷新间隔（毫秒） */
  refreshInterval?: number;
  /** 自定义类名 */
  className?: string;
  /** 点击 Agent 卡片的回调 */
  onAgentClick?: (agent: AgentCapability) => void;
  /** 最大显示数量 */
  maxDisplay?: number;
  /** 初始状态筛选 */
  initialFilter?: StatusFilter;
}

interface AgentCardProps {
  agentInfo: ExtendedAgentInfo;
  onClick?: () => void;
  showMetrics?: boolean;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据 agent 当前状态和活跃时间计算状态
 */
function getAgentStatus(agent: AgentCapability): AgentStatus {
  const now = Date.now();
  const inactiveThreshold = 300000; // 5 分钟未活跃视为离线
  
  if (!agent.availability) {
    return 'offline';
  }
  
  // 检查是否长时间未活跃
  if (now - agent.lastActiveTime > inactiveThreshold) {
    return 'offline';
  }
  
  // 检查是否有错误标记
  if (agent.currentLoad < 0) {
    return 'error';
  }
  
  if (agent.currentLoad > 0) {
    return 'busy';
  }
  
  return 'idle';
}

/**
 * 获取 agent 当前任务
 */
function getAgentCurrentTask(agentId: string, tasks: Task[]): Task | null {
  return tasks.find(
    task => task.assignedAgent === agentId && task.status === 'in_progress'
  ) || null;
}

/**
 * 生成模拟系统资源数据
 * 实际应用中应从监控系统获取
 */
function getSystemResources(status: AgentStatus): SystemResource {
  // 返回模拟数据
  const baseLoad = status === 'busy' ? 60 : 20;
  const variance = Math.random() * 20 - 10;
  
  return {
    cpuUsage: Math.max(0, Math.min(100, Math.round(baseLoad + variance))),
    memoryUsage: Math.max(0, Math.min(100, Math.round(baseLoad * 0.7 + variance * 0.5)))
  };
}

/**
 * 格式化最后活跃时间
 */
function formatLastActive(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} 分钟前`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} 小时前`;
  } else {
    const days = Math.floor(diff / 86400000);
    return `${days} 天前`;
  }
}

/**
 * 获取 provider 显示名称
 */
function getProviderName(provider: AgentProvider): string {
  const names: Record<AgentProvider, string> = {
    'minimax': 'MiniMax',
    'bailian': '百炼',
    'volcengine': '火山引擎',
    'self-claude': 'Claude'
  };
  return names[provider] || provider;
}

/**
 * 获取状态颜色配置
 */
function getStatusConfig(status: AgentStatus) {
  const configs = {
    idle: {
      bg: 'bg-blue-500',
      indicator: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/30',
      label: '空闲'
    },
    busy: {
      bg: 'bg-green-500',
      indicator: 'bg-green-500 animate-pulse',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800/30',
      label: '忙碌'
    },
    offline: {
      bg: 'bg-zinc-500',
      indicator: 'bg-zinc-500',
      text: 'text-zinc-600 dark:text-zinc-400',
      border: 'border-zinc-200 dark:border-zinc-700/30',
      label: '离线'
    },
    error: {
      bg: 'bg-red-500',
      indicator: 'bg-red-500 animate-pulse',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/30',
      label: '错误'
    }
  };
  return configs[status];
}

/**
 * 获取筛选器配置
 */
function getFilterConfig(filter: StatusFilter) {
  const configs = {
    all: { label: '全部', color: 'bg-zinc-500' },
    idle: { label: '空闲', color: 'bg-blue-500' },
    busy: { label: '忙碌', color: 'bg-green-500' },
    offline: { label: '离线', color: 'bg-zinc-500' },
    error: { label: '错误', color: 'bg-red-500' }
  };
  return configs[filter];
}

// ============================================================================
// 子组件：单个 Agent 状态卡片
// ============================================================================

const AgentCard: FC<AgentCardProps> = ({ 
  agentInfo, 
  onClick,
  showMetrics = false 
}) => {
  const { agent, status, currentTask, resources } = agentInfo;
  const statusConfig = getStatusConfig(status);
  
  return (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden
        p-4 bg-white dark:bg-zinc-800/50
        rounded-xl border ${statusConfig.border}
        transition-all duration-300
        hover:scale-[1.02] hover:shadow-lg
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {/* 顶部状态指示条 */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${statusConfig.bg}`} />
      
      {/* 头部：名称和状态 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Agent 图标 */}
          <div className={`
            w-10 h-10 rounded-xl 
            flex items-center justify-center flex-shrink-0
            bg-gradient-to-br from-blue-50 to-blue-100 
            dark:from-blue-900/30 dark:to-blue-800/20
            border border-blue-200 dark:border-blue-700/30
          `}>
            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          
          {/* 名称和角色 */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {agent.name}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {agent.role} · {agent.agentId}
            </p>
          </div>
        </div>
        
        {/* 状态指示器 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${statusConfig.indicator}`} />
          <span className={`text-xs font-medium ${statusConfig.text}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>
      
      {/* 当前任务 */}
      {currentTask && (
        <div className="mt-3 p-2 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Activity className="w-3.5 h-3.5 text-green-500" />
            <span className="text-zinc-700 dark:text-zinc-300 truncate">
              {currentTask.title}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>优先级: {currentTask.priority}</span>
            {currentTask.estimatedDuration && (
              <span>预计 {currentTask.estimatedDuration}分钟</span>
            )}
          </div>
        </div>
      )}
      
      {/* 系统资源 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {/* CPU 使用率 */}
        <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg">
          <Cpu className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-zinc-500 dark:text-zinc-400">CPU</span>
              <span className="text-zinc-700 dark:text-zinc-300">{resources.cpuUsage}%</span>
            </div>
            <div className="h-1 bg-zinc-200 dark:bg-zinc-600 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  resources.cpuUsage > 80 ? 'bg-red-500' : 
                  resources.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${resources.cpuUsage}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* 内存使用率 */}
        <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg">
          <HardDrive className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-zinc-500 dark:text-zinc-400">内存</span>
              <span className="text-zinc-700 dark:text-zinc-300">{resources.memoryUsage}%</span>
            </div>
            <div className="h-1 bg-zinc-200 dark:bg-zinc-600 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  resources.memoryUsage > 80 ? 'bg-red-500' : 
                  resources.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${resources.memoryUsage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 详情区域 */}
      <div className="mt-3 space-y-2">
        {/* Provider 和负载 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <Server className="w-3.5 h-3.5" />
            <span>{getProviderName(agent.provider)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span className="text-zinc-700 dark:text-zinc-300">
              {agent.currentLoad}% 负载
            </span>
          </div>
        </div>
        
        {/* 最后活跃时间 */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="w-3.5 h-3.5" />
          <span>最后心跳：{formatLastActive(agent.lastActiveTime)}</span>
        </div>
        
        {/* 详细指标 */}
        {showMetrics && agent.metrics && (
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700/50">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {agent.metrics.totalTasksCompleted}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">完成任务</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {agent.metrics.averageCompletionTime}m
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">平均时间</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {(agent.metrics.errorRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">错误率</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Hover 操作按钮 */}
      {onClick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: 显示下拉菜单
            }}
          >
            <MoreVertical className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 主组件：Agent 状态面板
// ============================================================================

export const AgentStatusPanel: FC<AgentStatusPanelProps> = ({
  showRefresh = true,
  showMetrics = true,
  autoRefresh = true,
  refreshInterval = 10000, // 默认 10 秒
  className = '',
  onAgentClick,
  maxDisplay,
  initialFilter = 'all'
}) => {
  const agents = useSchedulerStore(selectAgents);
  const tasks = useSchedulerStore(selectTasks);
  const availability = useSchedulerStore(selectAgentAvailability);
  const refresh = useSchedulerStore(state => state.refresh);
  const isLoading = useSchedulerStore(state => state.isLoading);
  
  // 状态筛选
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);
  
  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);
  
  // 扩展 Agent 信息（包含状态、任务和资源）
  const extendedAgents = useMemo(() => {
    return agents.map(agent => {
      const status = getAgentStatus(agent);
      const currentTask = getAgentCurrentTask(agent.agentId, tasks);
      const resources = getSystemResources(status);
      
      return {
        agent,
        status,
        currentTask,
        resources
      };
    });
  }, [agents, tasks]);
  
  // 根据筛选条件过滤 Agent
  const filteredAgents = useMemo(() => {
    if (statusFilter === 'all') {
      return extendedAgents;
    }
    return extendedAgents.filter(a => a.status === statusFilter);
  }, [extendedAgents, statusFilter]);
  
  // 按状态排序：busy > idle > offline > error
  const sortedAgents = useMemo(() => {
    const statusOrder: AgentStatus[] = ['busy', 'idle', 'offline', 'error'];
    return [...filteredAgents].sort((a, b) => 
      statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
    );
  }, [filteredAgents]);
  
  // 限制显示数量
  const displayAgents = useMemo(() => {
    if (maxDisplay && sortedAgents.length > maxDisplay) {
      return sortedAgents.slice(0, maxDisplay);
    }
    return sortedAgents;
  }, [sortedAgents, maxDisplay]);
  
  // 统计各状态的 Agent 数量
  const statusCounts = useMemo(() => {
    const counts: Record<AgentStatus, number> = {
      idle: 0,
      busy: 0,
      offline: 0,
      error: 0
    };
    
    extendedAgents.forEach(a => {
      counts[a.status]++;
    });
    
    return counts;
  }, [extendedAgents]);

  return (
    <div className={`${className}`}>
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            智能体状态
          </h3>
          
          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <div className="flex items-center gap-1.5">
              {(['all', 'idle', 'busy', 'offline', 'error'] as StatusFilter[]).map(filter => {
                const config = getFilterConfig(filter);
                const count = filter === 'all' 
                  ? extendedAgents.length 
                  : statusCounts[filter];
                
                return (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`
                      px-2.5 py-1 rounded-full text-xs font-medium
                      transition-all duration-200
                      ${statusFilter === filter
                        ? `${config.color} text-white`
                        : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600/50'
                      }
                    `}
                  >
                    {config.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* 刷新按钮 */}
        {showRefresh && (
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className={`
              p-2 rounded-lg
              bg-zinc-100 dark:bg-zinc-700/50
              hover:bg-zinc-200 dark:hover:bg-zinc-600/50
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title="刷新状态"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-600 dark:text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      
      {/* Agent 列表 */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400">暂无智能体数据</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            请初始化调度器以加载智能体
          </p>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Filter className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400">
            没有 {getFilterConfig(statusFilter).label} 状态的智能体
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayAgents.map(agentInfo => (
            <AgentCard
              key={agentInfo.agent.agentId}
              agentInfo={agentInfo}
              showMetrics={showMetrics}
              onClick={onAgentClick ? () => onAgentClick(agentInfo.agent) : undefined}
            />
          ))}
        </div>
      )}
      
      {/* 显示更多提示 */}
      {maxDisplay && filteredAgents.length > maxDisplay && (
        <div className="mt-4 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            显示前 {maxDisplay} 个智能体，当前筛选共 {filteredAgents.length} 个，总计 {agents.length} 个
          </p>
        </div>
      )}
      
      {/* 可用性摘要 */}
      {agents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              整体可用率
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${availability.percentage}%` }}
                />
              </div>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {availability.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 紧凑版本组件
// ============================================================================

export interface AgentStatusCompactProps {
  className?: string;
}

/**
 * 紧凑版的 Agent 状态显示，适合侧边栏或小空间使用
 */
export const AgentStatusCompact: FC<AgentStatusCompactProps> = ({ className = '' }) => {
  const agents = useSchedulerStore(selectAgents);
  
  const stats = useMemo(() => {
    const extended = agents.map(agent => ({
      status: getAgentStatus(agent)
    }));
    
    return {
      idle: extended.filter(a => a.status === 'idle').length,
      busy: extended.filter(a => a.status === 'busy').length,
      offline: extended.filter(a => a.status === 'offline').length,
      error: extended.filter(a => a.status === 'error').length,
      total: agents.length
    };
  }, [agents]);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {stats.total} 智能体
        </span>
      </div>
      
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.idle}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.busy}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-zinc-500" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.offline}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats.error}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 默认导出
// ============================================================================

export default AgentStatusPanel;
