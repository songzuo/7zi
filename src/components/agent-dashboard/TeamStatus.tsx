/**
 * Agent Dashboard - Team Status Component
 * 
 * Displays team member status with real-time updates
 */

'use client';

import { useMemo } from 'react';
import { useDarkMode } from '@/stores/preferencesStore';
import { AgentCapability } from '@/lib/agent-scheduler/models/agent-capability';

// ============================================================================
// Types
// ============================================================================

export type AgentStatusType = 'online' | 'busy' | 'idle' | 'offline';

export interface AgentDisplay extends AgentCapability {
  displayStatus: AgentStatusType;
  currentTaskTitle?: string;
  avatar?: string;
}

export interface TeamStatusProps {
  /** List of agents to display */
  agents: AgentCapability[];
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Agent Icons (Emoji avatars based on agent type)
// ============================================================================

const AGENT_ICONS: Record<string, string> = {
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine agent display status based on availability and load
 */
function getAgentDisplayStatus(agent: AgentCapability): AgentStatusType {
  if (!agent.availability) return 'offline';
  if (agent.currentLoad >= agent.capabilities.concurrency) return 'busy';
  if (agent.currentLoad > 0) return 'busy';
  return 'online';
}

/**
 * Get agent icon by ID
 */
function getAgentIcon(agentId: string): string {
  return AGENT_ICONS[agentId] || '🤖';
}

// ============================================================================
// Component
// ============================================================================

export function TeamStatus({
  agents,
  className = '',
}: TeamStatusProps) {
  const isDark = useDarkMode();

  // Transform agents with display data
  const displayAgents = useMemo((): AgentDisplay[] => {
    return agents.map(agent => ({
      ...agent,
      displayStatus: getAgentDisplayStatus(agent),
      avatar: getAgentIcon(agent.agentId),
    }));
  }, [agents]);

  // Calculate team statistics
  const teamStats = useMemo(() => {
    const online = displayAgents.filter(a => a.displayStatus === 'online').length;
    const busy = displayAgents.filter(a => a.displayStatus === 'busy').length;
    const offline = displayAgents.filter(a => a.displayStatus === 'offline').length;
    const total = displayAgents.length;
    
    return {
      online,
      busy,
      offline,
      total,
      efficiency: total > 0 ? Math.round((online + busy) / total * 100) : 0,
    };
  }, [displayAgents]);

  // Get status indicator styles
  const getStatusStyles = (status: AgentStatusType) => {
    const styles = {
      'online': {
        bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
        dot: 'bg-emerald-500',
        text: isDark ? 'text-emerald-400' : 'text-emerald-700',
        label: '在线',
        pulse: true,
      },
      'busy': {
        bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
        dot: 'bg-amber-500',
        text: isDark ? 'text-amber-400' : 'text-amber-700',
        label: '忙碌',
        pulse: true,
      },
      'idle': {
        bg: isDark ? 'bg-zinc-500/20' : 'bg-zinc-100',
        dot: 'bg-zinc-400',
        text: isDark ? 'text-zinc-400' : 'text-zinc-600',
        label: '空闲',
        pulse: false,
      },
      'offline': {
        bg: isDark ? 'bg-red-500/20' : 'bg-red-100',
        dot: 'bg-red-500',
        text: isDark ? 'text-red-400' : 'text-red-700',
        label: '离线',
        pulse: false,
      },
    };
    return styles[status];
  };

  // Get type label
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'strategic': '策略',
      'research': '研究',
      'technical': '技术',
      'execution': '执行',
      'operations': '运维',
      'quality': '质量',
      'creative': '创意',
      'marketing': '营销',
      'business': '商务',
    };
    return labels[type] || type;
  };

  return (
    <div className={`rounded-xl border backdrop-blur-sm ${isDark ? 'bg-zinc-800/80 border-zinc-700/50' : 'bg-white/90 border-zinc-200/50'} ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-zinc-200/50 dark:border-zinc-700/50">
        <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          🤖 AI 团队状态
        </h2>

        {/* Team Stats Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              在线 {teamStats.online}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              忙碌 {teamStats.busy}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              离线 {teamStats.offline}
            </span>
          </div>
        </div>

        {/* Efficiency Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>团队效率</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {teamStats.efficiency}%
            </span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${teamStats.efficiency}%` }}
            />
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
        {displayAgents.map((agent) => {
          const statusStyles = getStatusStyles(agent.displayStatus);
          
          return (
            <div
              key={agent.agentId}
              className={`
                p-3 rounded-lg border transition-all duration-200
                hover:scale-[1.02] hover:shadow-md cursor-pointer
                ${statusStyles.bg}
                ${isDark ? 'border-zinc-700/50 hover:border-zinc-600' : 'border-zinc-200/50 hover:border-zinc-300'}
              `}
            >
              {/* Avatar + Status */}
              <div className="flex items-center gap-2 mb-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-zinc-100 dark:bg-zinc-700">
                    {agent.avatar}
                  </div>
                  {/* Status Indicator */}
                  <div 
                    className={`
                      absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 
                      ${statusStyles.dot}
                      ${isDark ? 'border-zinc-800' : 'border-white'}
                      ${statusStyles.pulse ? 'animate-pulse' : ''}
                    `}
                  />
                </div>

                {/* Name + Status Badge */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {agent.name}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusStyles.bg} ${statusStyles.text}`}>
                    {statusStyles.label}
                  </span>
                </div>
              </div>

              {/* Type + Load */}
              <div className="flex items-center justify-between text-xs">
                <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>
                  {getTypeLabel(agent.role)}
                </span>
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                  负载: {agent.currentLoad}/{agent.capabilities.concurrency}
                </span>
              </div>

              {/* Success Rate */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-600 rounded-full overflow-hidden">
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
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default TeamStatus;
