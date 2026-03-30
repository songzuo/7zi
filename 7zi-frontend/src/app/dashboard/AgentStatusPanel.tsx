'use client';

/**
 * AgentStatusPanel 组件 - AI Agent 状态监控面板
 * 
 * 用于实时显示所有 Agent 的状态、当前任务和资源使用情况
 * 
 * @version 1.1.0
 * @date 2026-03-30
 * @author 🎨 设计师 (AI Agent)
 */

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Card, CardHeader, CardBody, CardActions, CardBadge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';

// ============================================
// 类型定义
// ============================================

export interface AgentTask {
  /** 任务 ID */
  id: string;
  /** 任务名称 */
  title: string;
  /** 任务类型 */
  type: string;
  /** 任务状态 */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** 任务进度 (0-100) */
  progress: number;
  /** 开始时间 */
  startedAt: string;
  /** 预计完成时间 */
  estimatedCompletionAt?: string;
}

export interface ResourceUsage {
  /** CPU 使用率 (0-100) */
  cpu: number;
  /** 内存使用率 (0-100) */
  memory: number;
  /** 网络流量 (字节) */
  network?: {
    inbound: number;
    outbound: number;
  };
  /** 自定义指标 */
  custom?: {
    name: string;
    value: number;
    unit: string;
  }[];
}

export interface Agent {
  /** Agent 唯一标识符 */
  id: string;
  /** Agent 名称 */
  name: string;
  /** Agent 类型 */
  type: 'designer' | 'developer' | 'tester' | 'manager' | 'custom';
  /** Agent 状态 */
  status: 'active' | 'idle' | 'offline' | 'error';
  /** Agent 描述 */
  description?: string;
  /** 当前正在执行的任务 */
  currentTask?: AgentTask;
  /** 资源使用情况 */
  resourceUsage?: ResourceUsage;
  /** 最后活动时间 */
  lastActiveAt: string;
  /** 是否启用 */
  enabled: boolean;
}

export interface AgentStatusPanelProps {
  /** Agent 列表数据 */
  agents: Agent[];
  /** 是否加载中 */
  loading?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** Agent 详情查看回调 */
  onViewDetails?: (agent: Agent) => void;
  /** Agent 启用/禁用切换回调 */
  onToggleAgent?: (agentId: string, enabled: boolean) => void;
  /** 自定义类名 */
  className?: string;
  /** 每页显示数量 */
  pageSize?: number;
  /** 是否显示资源使用详情 */
  showResourceDetails?: boolean;
  /** 刷新间隔（毫秒） */
  refreshInterval?: number;
  /** 状态筛选 */
  statusFilter?: Agent['status'][];
}

// ============================================
// 配置映射
// ============================================

// 颜色配置（不含文本，文本通过 i18n 动态获取）
const STATUS_COLORS: Record<Agent['status'], { 
  color: 'green' | 'blue' | 'gray' | 'red';
  dotColor: string;
}> = {
  active: { color: 'green', dotColor: 'bg-green-500' },
  idle: { color: 'blue', dotColor: 'bg-blue-500' },
  offline: { color: 'gray', dotColor: 'bg-gray-400' },
  error: { color: 'red', dotColor: 'bg-red-500' },
};

const TYPE_ICONS: Record<Agent['type'], string> = {
  designer: '🎨',
  developer: '💻',
  tester: '🧪',
  manager: '📋',
  custom: '⚙️',
};

// ============================================
// 辅助组件
// ============================================

/** 资源使用进度条 */
const ResourceBar = memo(function ResourceBar({ 
  value, 
  label, 
  showWarning = true 
}: { 
  value: number; 
  label: string;
  showWarning?: boolean;
}) {
  const getColor = useCallback((val: number) => {
    if (val >= 80) return 'bg-red-500';
    if (val >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-12">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={clsx(
            'h-full transition-all duration-500 ease-out rounded-full',
            getColor(value)
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className={clsx(
        'text-xs font-medium w-10 text-right',
        value >= 80 ? 'text-red-500' : value >= 50 ? 'text-yellow-500' : 'text-gray-600 dark:text-gray-400'
      )}>
        {value.toFixed(0)}%
      </span>
    </div>
  );
});

/** 任务进度条 */
const TaskProgress = memo(function TaskProgress({ progress, status }: { progress: number; status: AgentTask['status'] }) {
  const statusColors: Record<AgentTask['status'], string> = {
    pending: 'bg-gray-400',
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={clsx(
            'h-full transition-all duration-300 rounded-full',
            statusColors[status]
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{progress}%</span>
    </div>
  );
});

// ============================================
// AgentCard 组件
// ============================================

interface AgentCardProps {
  agent: Agent;
  showResourceDetails?: boolean;
  onViewDetails?: (agent: Agent) => void;
  onToggle?: (agentId: string, enabled: boolean) => void;
}

const AgentCard = memo(function AgentCard({ 
  agent, 
  showResourceDetails = true,
  onViewDetails,
  onToggle 
}: AgentCardProps) {
  const { t, i18n } = useTranslation('dashboard');
  const statusConfig = STATUS_COLORS[agent.status];
  const typeIcon = TYPE_ICONS[agent.type];

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(agent);
  }, [agent, onViewDetails]);

  const handleToggle = useCallback(() => {
    onToggle?.(agent.id, !agent.enabled);
  }, [agent.id, agent.enabled, onToggle]);

  const lastActiveText = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(agent.lastActiveAt), { 
        addSuffix: true, 
        locale: i18n.language === 'zh' ? zhCN : enUS 
      });
    } catch {
      return 'Unknown';
    }
  }, [agent.lastActiveAt, i18n.language]);

  return (
    <Card
      hoverable
      className={clsx(
        'group relative',
        !agent.enabled && 'opacity-60'
      )}
    >
      {/* 状态指示条 */}
      <div
        className={clsx(
          'absolute left-0 top-4 bottom-4 w-1 rounded-full transition-all duration-300',
          statusConfig.dotColor
        )}
      />

      <CardHeader bordered={false} className="pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{typeIcon}</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {agent.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <CardBadge color={statusConfig.color} variant="soft" size="sm">
                {t(`agent.status.${agent.status}`)}
              </CardBadge>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t(`agent.type.${agent.type}`)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={clsx(
                'w-2 h-2 rounded-full',
                statusConfig.dotColor,
                agent.status === 'active' && 'animate-pulse'
              )}
            />
          </div>
        </div>
      </CardHeader>

      <CardBody padding="sm" className="pl-4">
        {/* 当前任务 */}
        {agent.currentTask && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('agent.currentTask')}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {agent.currentTask.type}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1 line-clamp-1">
              {agent.currentTask.title}
            </p>
            <TaskProgress 
              progress={agent.currentTask.progress} 
              status={agent.currentTask.status} 
            />
          </div>
        )}

        {/* 资源使用情况 */}
        {showResourceDetails && agent.resourceUsage && (
          <div className="space-y-1.5 mb-3">
            <ResourceBar value={agent.resourceUsage.cpu} label={t('agent.resource.cpu')} />
            <ResourceBar value={agent.resourceUsage.memory} label={t('agent.resource.memory')} />
          </div>
        )}

        {/* 最后活动时间 */}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t('agent.lastActive')}: {lastActiveText}</span>
        </div>
      </CardBody>

      <CardActions align="right">
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewDetails}
        >
          {t('agent.details')}
        </Button>
        <Button
          variant={agent.enabled ? 'danger' : 'ghost'}
          size="sm"
          onClick={handleToggle}
        >
          {agent.enabled ? t('agent.disable') : t('agent.enable')}
        </Button>
      </CardActions>
    </Card>
  );
});

// ============================================
// StatsSummary 组件
// ============================================

interface StatsSummaryProps {
  agents: Agent[];
}

const StatsSummary = memo(function StatsSummary({ agents }: StatsSummaryProps) {
  const { t } = useTranslation('dashboard');

  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter(a => a.status === 'active').length;
    const idle = agents.filter(a => a.status === 'idle').length;
    const offline = agents.filter(a => a.status === 'offline').length;
    const error = agents.filter(a => a.status === 'error').length;
    
    const avgCpu = agents.length > 0
      ? agents.reduce((sum, a) => sum + (a.resourceUsage?.cpu || 0), 0) / agents.length
      : 0;
    
    const avgMemory = agents.length > 0
      ? agents.reduce((sum, a) => sum + (a.resourceUsage?.memory || 0), 0) / agents.length
      : 0;

    return { total, active, idle, offline, error, avgCpu, avgMemory };
  }, [agents]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.total')}</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {t('agent.status.active')}
        </div>
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          {t('agent.status.idle')}
        </div>
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.idle}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          {t('agent.status.offline')}
        </div>
        <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.offline}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {t('agent.status.error')}
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.error}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.avgCpu')}</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.avgCpu.toFixed(0)}%</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.avgMemory')}</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.avgMemory.toFixed(0)}%</div>
      </div>
    </div>
  );
});

// ============================================
// FilterBar 组件
// ============================================

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: Agent['status'] | 'all';
  onStatusChange: (status: Agent['status'] | 'all') => void;
  onRefresh?: () => void;
}

const FilterBar = memo(function FilterBar({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onRefresh,
}: FilterBarProps) {
  const { t } = useTranslation('dashboard');
  const statusOptions: (Agent['status'] | 'all')[] = ['all', 'active', 'idle', 'offline', 'error'];

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* 搜索框 */}
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('agent.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 状态筛选 */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {statusOptions.map((status) => {
          const isActive = status === selectedStatus;
          const label = status === 'all' ? t('filters.all') : t(`agent.status.${status}`);
          
          return (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                isActive
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 刷新按钮 */}
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('actions.refresh')}
        </Button>
      )}
    </div>
  );
});

// ============================================
// AgentStatusPanel 主组件
// ============================================

export const AgentStatusPanel = memo(function AgentStatusPanel({
  agents,
  loading = false,
  onRefresh,
  onViewDetails,
  onToggleAgent,
  className,
  pageSize = 10,
  showResourceDetails = true,
  refreshInterval,
  statusFilter,
}: AgentStatusPanelProps) {
  const { t } = useTranslation('dashboard');
  
  // 状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Agent['status'] | 'all'>(
    statusFilter && statusFilter.length === 1 ? statusFilter[0] : 'all'
  );
  const [currentPage, setCurrentPage] = useState(1);

  // 自动刷新
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0 && onRefresh) {
      const interval = setInterval(onRefresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, onRefresh]);

  // 过滤和搜索
  const filteredAgents = useMemo(() => {
    let result = agents;

    // 状态筛选
    if (selectedStatus !== 'all') {
      result = result.filter(agent => agent.status === selectedStatus);
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(agent => 
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [agents, selectedStatus, searchQuery]);

  // 分页
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAgents.length / pageSize);

  // 加载状态
  if (loading) {
    return (
      <div className={clsx('space-y-4', className)}>
        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  // 空状态
  if (agents.length === 0) {
    return (
      <div className={clsx('text-center py-12 px-4', className)}>
        <div className="text-6xl mb-4">🤖</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('agent.noAgents')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('agent.noAgentsDescription')}
        </p>
        <Button variant="primary" onClick={onRefresh}>
          {t('actions.refresh')}
        </Button>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-6', className)}>
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('agent.title')}
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('agent.count', { count: agents.length })}
        </span>
      </div>

      {/* 统计概览 */}
      <StatsSummary agents={agents} />

      {/* 筛选栏 */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={(status) => {
          setSelectedStatus(status);
          setCurrentPage(1);
        }}
        onRefresh={onRefresh}
      />

      {/* Agent 列表 */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('agent.noMatching')}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                showResourceDetails={showResourceDetails}
                onViewDetails={onViewDetails}
                onToggle={onToggleAgent}
              />
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {t('agent.previousPage')}
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t('agent.nextPage')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

AgentStatusPanel.displayName = 'AgentStatusPanel';

// ============================================
// 导出
// ============================================

export default AgentStatusPanel;
