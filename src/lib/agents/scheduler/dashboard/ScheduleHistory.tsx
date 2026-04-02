'use client'

/**
 * ScheduleHistory.tsx
 * Displays scheduling decision history with reasoning and confidence
 * Features:
 * - Decision history list with pagination
 * - Agent and task information display
 * - Confidence scores with visual indicators
 * - Filtering by agent, task, or outcome
 * - Manual override tracking
 */

import React, { useState, useMemo } from 'react'
import { useSchedulerStore, selectRecentDecisions } from '../stores/scheduler-store'
import type { ScheduleDecision } from '../models/schedule-decision'
import type { AgentCapability } from '../models/agent-capability'

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
 * Outcome type for filtering
 */
type OutcomeType = 'all' | 'successful' | 'failed' | 'manual'

/**
 * Outcome colors
 */
const OUTCOME_COLORS: Record<OutcomeType, { bg: string; text: string; icon: string }> = {
  all: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: '📊' },
  successful: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    icon: '✅',
  },
  failed: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    icon: '❌',
  },
  manual: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    icon: '👤',
  },
}

/**
 * Confidence bar component
 */
function ConfidenceBar({ confidence }: { confidence: number }) {
  const getColor = (conf: number) => {
    if (conf >= 0.8) return 'bg-green-500'
    if (conf >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">置信度</span>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
          {(confidence * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getColor(confidence)}`}
          style={{ width: `${Math.min(confidence * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Decision card component
 */
interface DecisionCardProps {
  decision: ScheduleDecision
  agents: AgentCapability[]
  isExpanded: boolean
  onToggle: () => void
  currentTime?: number
}

function DecisionCard({
  decision,
  agents,
  isExpanded,
  onToggle,
  currentTime = Date.now(),
}: DecisionCardProps) {
  const agent = agents.find(a => a.agentId === decision.assignedAgent)
  const emoji = agent ? AGENT_EMOJIS[agent.agentId] || '🤖' : '🤖'
  const agentName = agent?.name || 'Unknown Agent'

  // Format timestamp
  const timestamp = new Date(decision.decisionTime || currentTime).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  // Determine outcome
  const isManual = decision.manualOverride === true
  const outcome: OutcomeType = isManual ? 'manual' : 'successful'

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-50 to-purple-50 text-xl dark:border-gray-700 dark:from-blue-900/20 dark:to-purple-900/20">
              {emoji}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{agentName}</h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Task: {decision.taskId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${OUTCOME_COLORS[outcome].bg} ${OUTCOME_COLORS[outcome].text}`}
            >
              {OUTCOME_COLORS[outcome].icon} {outcome.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{timestamp}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        {/* Confidence bar */}
        <ConfidenceBar confidence={decision.confidence} />

        {/* Reasoning */}
        {decision.reasoning && (
          <div>
            <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">分配原因:</p>
            <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
              {decision.reasoning}
            </p>
          </div>
        )}

        {/* Manual override info */}
        {isManual && (
          <div className="rounded-md bg-purple-50 p-2 dark:bg-purple-900/20">
            <p className="mb-1 text-xs font-medium text-purple-700 dark:text-purple-400">
              👤 手动干预
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-500">
              操作者: {decision.overrideBy || 'Unknown'}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-500">
              原因: Manual override by {decision.overrideBy || 'user'}
            </p>
          </div>
        )}

        {/* Alternative agents */}
        {decision.alternativeAgents && decision.alternativeAgents.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
              备选 Agent:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {decision.alternativeAgents.slice(0, 3).map((altAgentId, idx) => {
                const altAgent = agents.find(a => a.agentId === altAgentId)
                if (!altAgent) return null
                return (
                  <span
                    key={idx}
                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {AGENT_EMOJIS[altAgent.agentId] || '🤖'} {altAgent.name}
                  </span>
                )
              })}
              {decision.alternativeAgents.length > 3 && (
                <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-600 dark:text-gray-400">
                  +{decision.alternativeAgents.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Estimated completion */}
        {decision.estimatedCompletion && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">预计完成:</span>{' '}
            {new Date(decision.estimatedCompletion).toLocaleString('zh-CN')}
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {isExpanded ? '收起详情' : '查看详情'}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="space-y-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
          {/* Full reasoning */}
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
              完整分配原因:
            </p>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {decision.reasoning}
            </p>
          </div>

          {/* Scoring details (if available) */}
          {decision.scores && (
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                评分详情:
              </p>
              <div className="space-y-2">
                {Object.entries(decision.scores).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{key}:</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {(value as number).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
            <div>
              <span className="font-medium">决策时间:</span> {timestamp}
            </div>
            <div>
              <span className="font-medium">任务 ID:</span> {decision.taskId}
            </div>
            <div>
              <span className="font-medium">Agent ID:</span> {decision.assignedAgent}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Pagination controls
 */
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = useMemo(() => {
    const range: (number | string)[] = []
    const showEllipsis = totalPages > 7

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i)
      }
    } else {
      if (currentPage <= 4) {
        range.push(1, 2, 3, 4, 5, '...', totalPages)
      } else if (currentPage >= totalPages - 3) {
        range.push(
          1,
          '...',
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        )
      } else {
        range.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }

    return range
  }, [currentPage, totalPages])

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        上一页
      </button>

      <div className="flex items-center gap-1">
        {pages.map((page, idx) =>
          typeof page === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(page)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={idx} className="px-2 text-gray-500 dark:text-gray-400">
              {page}
            </span>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        下一页
      </button>
    </div>
  )
}

/**
 * Main ScheduleHistory component
 */
export function ScheduleHistory() {
  const { recentDecisions, agents, isLoading, error, refresh } = useSchedulerStore()

  const [currentPage, setCurrentPage] = useState(1)
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeType>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDecisions, setExpandedDecisions] = useState<Set<string>>(new Set())
  const itemsPerPage = 10

  // Refresh on mount
  React.useEffect(() => {
    refresh()
  }, [refresh])

  // Filter decisions
  const filteredDecisions = useMemo(() => {
    return recentDecisions.filter(decision => {
      // Outcome filter
      const isManual = decision.manualOverride !== undefined
      if (outcomeFilter === 'manual' && !isManual) return false
      if (outcomeFilter === 'successful' && isManual) return false
      if (outcomeFilter === 'failed' && isManual) return false

      // Agent filter
      if (agentFilter !== 'all' && decision.assignedAgent !== agentFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const agent = agents.find(a => a.agentId === decision.assignedAgent)
        const agentName = agent?.name.toLowerCase() || ''
        const reasoning = decision.reasoning?.toLowerCase() || ''
        return (
          agentName.includes(query) ||
          decision.taskId.toLowerCase().includes(query) ||
          reasoning.includes(query)
        )
      }

      return true
    })
  }, [recentDecisions, outcomeFilter, agentFilter, searchQuery, agents])

  // Pagination
  const totalPages = Math.ceil(filteredDecisions.length / itemsPerPage)
  const paginatedDecisions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredDecisions.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredDecisions, currentPage, itemsPerPage])

  // Toggle decision expansion
  const toggleExpansion = (decisionId: string) => {
    setExpandedDecisions(prev => {
      const next = new Set(prev)
      if (next.has(decisionId)) {
        next.delete(decisionId)
      } else {
        next.add(decisionId)
      }
      return next
    })
  }

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [outcomeFilter, agentFilter, searchQuery])

  // Statistics
  const stats = useMemo(() => {
    const manual = recentDecisions.filter(d => d.manualOverride).length
    const automatic = recentDecisions.length - manual
    const avgConfidence =
      recentDecisions.length > 0
        ? recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length
        : 0

    return {
      total: recentDecisions.length,
      manual,
      automatic,
      avgConfidence,
    }
  }, [recentDecisions])

  if (isLoading && recentDecisions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">调度历史</h2>
        <p className="text-gray-600 dark:text-gray-400">查看所有调度决策的详细记录</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-100 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">总决策数</div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {stats.automatic}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">自动调度</div>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
            {stats.manual}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">手动干预</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {(stats.avgConfidence * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">平均置信度</div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Outcome Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              结果类型
            </label>
            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value as OutcomeType)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">全部</option>
              <option value="successful">自动调度</option>
              <option value="manual">手动干预</option>
            </select>
          </div>

          {/* Agent Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Agent
            </label>
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">全部 Agents</option>
              {agents.map(agent => (
                <option key={agent.agentId} value={agent.agentId}>
                  {AGENT_EMOJIS[agent.agentId] || '🤖'} {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              搜索
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索任务ID、Agent名称或原因..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Decisions List */}
      {paginatedDecisions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 text-4xl">📋</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            没有找到调度决策
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            尚未有任何调度决策记录，或筛选条件无匹配结果
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {paginatedDecisions.map(decision => {
              const decisionKey = `${decision.taskId}-${decision.decisionTime}`
              return (
                <DecisionCard
                  key={decisionKey}
                  decision={decision}
                  agents={agents}
                  isExpanded={expandedDecisions.has(decisionKey)}
                  onToggle={() => toggleExpansion(decisionKey)}
                  currentTime={Date.now()}
                />
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        显示 {paginatedDecisions.length} / {filteredDecisions.length} 条记录
      </div>
    </div>
  )
}

export default ScheduleHistory
