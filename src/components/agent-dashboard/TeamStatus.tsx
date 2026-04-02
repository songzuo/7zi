/**
 * Agent Dashboard - Team Status Component
 *
 * Displays team member status with real-time updates
 */

'use client'

import { useMemo } from 'react'
import { useDarkMode } from '@/stores/preferencesStore'
import { AgentCapability } from '@/lib/agents/scheduler/models/agent-capability'

// ============================================================================
// Types
// ============================================================================

export type AgentStatusType = 'online' | 'busy' | 'idle' | 'offline'

export interface AgentDisplay extends AgentCapability {
  displayStatus: AgentStatusType
  currentTaskTitle?: string
  avatar?: string
}

export interface TeamStatusProps {
  /** List of agents to display */
  agents: AgentCapability[]
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Agent Icons (Emoji avatars based on agent type)
// ============================================================================

const AGENT_ICONS: Record<string, string> = {
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine agent display status based on availability and load
 */
function getAgentDisplayStatus(agent: AgentCapability): AgentStatusType {
  if (!agent.availability) return 'offline'
  if (agent.currentLoad >= agent.capabilities.concurrency) return 'busy'
  if (agent.currentLoad > 0) return 'busy'
  return 'online'
}

/**
 * Get agent icon by ID
 */
function getAgentIcon(agentId: string): string {
  return AGENT_ICONS[agentId] || '🤖'
}

// ============================================================================
// Component
// ============================================================================

export function TeamStatus({ agents, className = '' }: TeamStatusProps) {
  const isDark = useDarkMode()

  // Transform agents with display data
  const displayAgents = useMemo((): AgentDisplay[] => {
    return agents.map(agent => ({
      ...agent,
      displayStatus: getAgentDisplayStatus(agent),
      avatar: getAgentIcon(agent.agentId),
    }))
  }, [agents])

  // Calculate team statistics
  const teamStats = useMemo(() => {
    const online = displayAgents.filter(a => a.displayStatus === 'online').length
    const busy = displayAgents.filter(a => a.displayStatus === 'busy').length
    const offline = displayAgents.filter(a => a.displayStatus === 'offline').length
    const total = displayAgents.length

    return {
      online,
      busy,
      offline,
      total,
      efficiency: total > 0 ? Math.round(((online + busy) / total) * 100) : 0,
    }
  }, [displayAgents])

  // Get status indicator styles
  const getStatusStyles = (status: AgentStatusType) => {
    const styles = {
      online: {
        bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
        dot: 'bg-emerald-500',
        text: isDark ? 'text-emerald-400' : 'text-emerald-700',
        label: '在线',
        pulse: true,
      },
      busy: {
        bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
        dot: 'bg-amber-500',
        text: isDark ? 'text-amber-400' : 'text-amber-700',
        label: '忙碌',
        pulse: true,
      },
      idle: {
        bg: isDark ? 'bg-zinc-500/20' : 'bg-zinc-100',
        dot: 'bg-zinc-400',
        text: isDark ? 'text-zinc-400' : 'text-zinc-600',
        label: '空闲',
        pulse: false,
      },
      offline: {
        bg: isDark ? 'bg-red-500/20' : 'bg-red-100',
        dot: 'bg-red-500',
        text: isDark ? 'text-red-400' : 'text-red-700',
        label: '离线',
        pulse: false,
      },
    }
    return styles[status]
  }

  // Get type label
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      strategic: '策略',
      research: '研究',
      technical: '技术',
      execution: '执行',
      operations: '运维',
      quality: '质量',
      creative: '创意',
      marketing: '营销',
      business: '商务',
    }
    return labels[type] || type
  }

  return (
    <div
      className={`rounded-xl border backdrop-blur-sm ${isDark ? 'border-zinc-700/50 bg-zinc-800/80' : 'border-zinc-200/50 bg-white/90'} ${className}`}
    >
      {/* Header */}
      <div className="border-b border-zinc-200/50 p-5 dark:border-zinc-700/50">
        <h2 className={`mb-3 text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          🤖 AI 团队状态
        </h2>

        {/* Team Stats Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              在线 {teamStats.online}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              忙碌 {teamStats.busy}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              离线 {teamStats.offline}
            </span>
          </div>
        </div>

        {/* Efficiency Bar */}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>团队效率</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {teamStats.efficiency}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${teamStats.efficiency}%` }}
            />
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="grid max-h-[500px] grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
        {displayAgents.map(agent => {
          const statusStyles = getStatusStyles(agent.displayStatus)

          return (
            <div
              key={agent.agentId}
              className={`cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${statusStyles.bg} ${isDark ? 'border-zinc-700/50 hover:border-zinc-600' : 'border-zinc-200/50 hover:border-zinc-300'} `}
            >
              {/* Avatar + Status */}
              <div className="mb-2 flex items-center gap-2">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-700">
                    {agent.avatar}
                  </div>
                  {/* Status Indicator */}
                  <div
                    className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 ${statusStyles.dot} ${isDark ? 'border-zinc-800' : 'border-white'} ${statusStyles.pulse ? 'animate-pulse' : ''} `}
                  />
                </div>

                {/* Name + Status Badge */}
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}
                  >
                    {agent.name}
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${statusStyles.bg} ${statusStyles.text}`}
                  >
                    {statusStyles.label}
                  </span>
                </div>
              </div>

              {/* Type + Load */}
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`rounded px-1.5 py-0.5 ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}
                >
                  {getTypeLabel(agent.role)}
                </span>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                  负载: {agent.currentLoad}/{agent.capabilities.concurrency}
                </span>
              </div>

              {/* Success Rate */}
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-600">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${agent.capabilities.successRate * 100}%` }}
                  />
                </div>
                <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {Math.round(agent.capabilities.successRate * 100)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default TeamStatus
