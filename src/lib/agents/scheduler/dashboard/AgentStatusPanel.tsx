'use client'

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

import { useState, useEffect, useCallback } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
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
} from 'lucide-react'
import { useSchedulerStore, selectAgentAvailability } from '../stores/scheduler-store'
import type { AgentCapability, TaskType } from '../models/agent-capability'
import type { Task, TaskStatus } from '../models/task-model'

/**
 * Agent display data structure
 */
interface AgentDisplay {
  id: string
  name: string
  emoji: string
  role: string
  provider: string
  status: 'available' | 'busy' | 'offline'
  currentLoad: number
  capabilities: {
    techStack: string[]
    taskTypes: string[]
    concurrency: number
    successRate: number
  }
  activeTasks: number
  avgResponseTime: number
}

/**
 * Agent emoji mapping
 */
const AGENT_EMOJIS: Record<string, string> = {
  'agent-expert': '🌟',
  consultant: '📚',
  architect: '🏗️',
  executor: '⚡',
  sysadmin: '🛡️',
  tester: '🧪',
  designer: '🎨',
  promoter: '📣',
  sales: '💼',
  finance: '💰',
  media: '📺',
}

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
]

/**
 * Transform AgentCapability to AgentDisplay
 */
function transformToDisplay(agent: AgentCapability, tasks: Task[]): AgentDisplay {
  const activeTaskCount = tasks.filter(
    t => t.assignedAgent === agent.agentId && t.status === 'in_progress'
  ).length

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
  }
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
  ]
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: 'available' | 'busy' | 'offline' }) {
  const config = {
    available: { color: 'bg-green-500', label: '可用', icon: CheckCircle },
    busy: { color: 'bg-yellow-500', label: '忙碌', icon: Clock },
    offline: { color: 'bg-red-500', label: '离线', icon: AlertCircle },
  }

  const { color, label, icon: Icon } = config[status]

  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2.5 w-2.5 rounded-full ${color} animate-pulse`} />
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <Icon className="h-3.5 w-3.5 text-gray-500" />
    </div>
  )
}

/**
 * Load progress bar component
 */
function LoadBar({ load }: { load: number }) {
  const getColor = (load: number) => {
    if (load < 50) return 'bg-green-500'
    if (load < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">当前负载</span>
        <span className="text-xs font-bold text-gray-700">{load}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${getColor(load)}`}
          style={{ width: `${Math.min(load, 100)}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Agent card component
 */
function AgentCard({
  agent,
  isExpanded,
  onToggle,
}: {
  agent: AgentDisplay
  isExpanded: boolean
  onToggle: () => void
}) {
  const radarData = generateRadarData(agent)

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md transition-all duration-300 hover:shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-50 to-purple-50 text-2xl shadow-sm">
              {agent.emoji}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{agent.name}</h3>
              <p className="mt-0.5 text-xs text-gray-500">{agent.role}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                提供商: <span className="font-medium text-gray-600">{agent.provider}</span>
              </p>
            </div>
          </div>
          <StatusIndicator status={agent.status} />
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        {/* Load bar */}
        <LoadBar load={agent.currentLoad} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-blue-50 p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-blue-600">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">活跃任务</span>
            </div>
            <p className="text-xl font-bold text-blue-700">{agent.activeTasks}</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-purple-600">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">响应时间</span>
            </div>
            <p className="text-xl font-bold text-purple-700">{agent.avgResponseTime}s</p>
          </div>
        </div>

        {/* Tech stack */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-600">技术栈</p>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.techStack.slice(0, 4).map((tech, i) => (
              <span
                key={i}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
              >
                {tech}
              </span>
            ))}
            {agent.capabilities.techStack.length > 4 && (
              <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                +{agent.capabilities.techStack.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Radar chart toggle */}
        <button
          onClick={onToggle}
          className="mt-2 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
        >
          <TrendingUp className="h-4 w-4" />
          {isExpanded ? '收起能力图' : '查看能力图'}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Radar chart (expandable) */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <p className="mb-3 text-center text-sm font-semibold text-gray-700">能力雷达图</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                />
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
                  formatter={value => `${(Number(value) ?? 0).toFixed(1)}%`}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Statistics summary component
 */
function StatisticsSummary() {
  const agents = useSchedulerStore(state => state.agents)
  const availability = selectAgentAvailability(useSchedulerStore.getState())

  const statusCounts = agents.reduce(
    (acc, agent) => {
      const status = !agent.availability ? 'offline' : agent.currentLoad > 80 ? 'busy' : 'available'
      acc[status]++
      return acc
    },
    { available: 0, busy: 0, offline: 0 }
  )

  const avgLoad =
    agents.length > 0 ? agents.reduce((sum, a) => sum + a.currentLoad, 0) / agents.length : 0

  return (
    <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <Users className="h-6 w-6" />
        Agent 状态总览
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white/20 p-4 backdrop-blur-sm">
          <p className="text-sm opacity-90">总 Agent 数</p>
          <p className="text-3xl font-bold">{availability.total}</p>
        </div>
        <div className="rounded-lg bg-white/20 p-4 backdrop-blur-sm">
          <p className="text-sm opacity-90">可用</p>
          <p className="text-3xl font-bold text-green-300">{statusCounts.available}</p>
        </div>
        <div className="rounded-lg bg-white/20 p-4 backdrop-blur-sm">
          <p className="text-sm opacity-90">忙碌</p>
          <p className="text-3xl font-bold text-yellow-300">{statusCounts.busy}</p>
        </div>
        <div className="rounded-lg bg-white/20 p-4 backdrop-blur-sm">
          <p className="text-sm opacity-90">平均负载</p>
          <p className="text-3xl font-bold">{avgLoad.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Main AgentStatusPanel component
 */
export function AgentStatusPanel() {
  const agents = useSchedulerStore(state => state.agents)
  const tasks = useSchedulerStore(state => state.tasks)
  const isLoading = useSchedulerStore(state => state.isLoading)
  const initialize = useSchedulerStore(state => state.initialize)
  const refresh = useSchedulerStore(state => state.refresh)

  const [selectedFilter, setSelectedFilter] = useState<TaskType | 'all'>('all')
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Initialize on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refresh()
    }, 30000)

    return () => clearInterval(interval)
  }, [refresh])

  // Transform and filter agents
  const displayAgents = agents
    .map(agent => transformToDisplay(agent, tasks))
    .filter(agent => {
      if (selectedFilter === 'all') return true
      return agent.capabilities.taskTypes.includes(selectedFilter as TaskType)
    })
    .sort((a, b) => {
      // Sort by status: available > busy > offline
      const statusOrder = { available: 0, busy: 1, offline: 2 }
      return statusOrder[a.status] - statusOrder[b.status]
    })

  // Toggle agent expansion
  const toggleExpansion = useCallback((agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }, [])

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    refresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [refresh])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Activity className="h-7 w-7 text-blue-600" />
            Agent 状态面板
          </h1>
          <p className="mt-1 text-sm text-gray-500">实时监控所有 AI Agent 的运行状态</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedFilter}
              onChange={e => setSelectedFilter(e.target.value as 'all' | TaskType)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* Statistics summary */}
      <StatisticsSummary />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 font-medium text-gray-600">加载中...</span>
        </div>
      )}

      {/* Agent grid */}
      {!isLoading && displayAgents.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
          <AlertCircle className="mb-3 h-12 w-12 text-gray-400" />
          <p className="font-medium text-gray-600">没有找到匹配的 Agent</p>
          <p className="mt-1 text-sm text-gray-500">请尝试调整筛选条件</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-gray-500">
        <p>
          最后更新:{' '}
          {new Date().toLocaleString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

export default AgentStatusPanel
