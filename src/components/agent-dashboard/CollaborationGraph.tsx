/**
 * Agent Dashboard - Collaboration Graph Component
 *
 * Visualizes agent collaboration flow using React Flow.
 * Displays agents as nodes with status indicators and task flow as edges.
 * Supports drag-and-drop, zoom, and pan interactions.
 * Receives real-time updates via WebSocket.
 *
 * @version v1.7.0 Phase 3
 */

'use client'

import { useCallback, useEffect, useMemo, useState, memo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  Panel,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDarkMode } from '@/stores/preferencesStore'

// ============================================================================
// Types
// ============================================================================

/**
 * Agent status types for visual indicators
 */
export type AgentStatus = 'idle' | 'running' | 'error' | 'offline'

/**
 * Agent node data structure
 */
export interface AgentNode {
  /** Unique agent identifier */
  id: string
  /** Agent display name */
  name: string
  /** Current agent status */
  status: AgentStatus
  /** Timestamp of last activity */
  lastActivity: number
  /** Optional avatar URL or emoji */
  avatar?: string
  /** Current task being processed */
  currentTask?: string
  /** Current load (0-100) */
  load?: number
}

/**
 * Connection between agents
 */
export interface ConnectionData {
  /** Source agent ID */
  source: string
  /** Target agent ID */
  target: string
  /** Associated task ID */
  taskId?: string
  /** Task type/category */
  taskType?: string
  /** Connection label */
  label?: string
}

/**
 * Component props
 */
export interface CollaborationGraphProps {
  /** List of agent nodes */
  agentNodes: AgentNode[]
  /** Connections between agents */
  connections: ConnectionData[]
  /** Optional callback when agents are updated */
  onAgentUpdate?: (agentId: string, updates: Partial<AgentNode>) => void
  /** Optional callback when connection is clicked */
  onConnectionClick?: (connection: ConnectionData) => void
  /** Additional CSS classes */
  className?: string
  /** Whether to enable real-time updates */
  enableRealtime?: boolean
}

// ============================================================================
// Internal Types
// ============================================================================

interface FlowNodeData {
  agent: AgentNode
  [key: string]: unknown // Index signature for React Flow compatibility
}

type FlowNode = Node<FlowNodeData>
type FlowEdge = Edge

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS: Record<AgentStatus, { bg: string; border: string; glow: string }> = {
  idle: {
    bg: '#10b981', // emerald-500
    border: '#059669', // emerald-600
    glow: 'rgba(16, 185, 129, 0.5)',
  },
  running: {
    bg: '#3b82f6', // blue-500
    border: '#2563eb', // blue-600
    glow: 'rgba(59, 130, 246, 0.5)',
  },
  error: {
    bg: '#ef4444', // red-500
    border: '#dc2626', // red-600
    glow: 'rgba(239, 68, 68, 0.5)',
  },
  offline: {
    bg: '#6b7280', // gray-500
    border: '#4b5563', // gray-600
    glow: 'rgba(107, 114, 128, 0.3)',
  },
}

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
  default: '🤖',
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Custom Agent Node Component
 */
const AgentNode = memo(({ data }: { data: FlowNodeData }) => {
  const { agent } = data
  const isDark = useDarkMode()

  const colors = STATUS_COLORS[agent.status] || STATUS_COLORS.offline
  const icon = agent.avatar || AGENT_ICONS[agent.id] || AGENT_ICONS.default

  const formatLastActivity = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }

  const statusLabel: Record<AgentStatus, string> = {
    idle: '空闲',
    running: '运行中',
    error: '错误',
    offline: '离线',
  }

  return (
    <div
      className={`relative rounded-lg border-2 px-4 py-3 transition-all duration-300 ${isDark ? 'bg-zinc-800/90' : 'bg-white/90'} cursor-pointer hover:scale-105 hover:shadow-xl`}
      style={{
        borderColor: colors.border,
        boxShadow: `0 0 20px ${colors.glow}`,
      }}
    >
      {/* Status indicator dot */}
      <div
        className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2"
        style={{
          backgroundColor: colors.bg,
          borderColor: isDark ? '#18181b' : '#ffffff',
        }}
      />

      {/* Agent icon and name */}
      <div className="mb-2 flex items-center gap-3">
        <span className="text-3xl" role="img" aria-label={agent.name}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}
          >
            {agent.name}
          </h3>
        </div>
      </div>

      {/* Status and load */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
            状态: {statusLabel[agent.status]}
          </span>
          {agent.load !== undefined && (
            <span
              className={`font-medium ${
                agent.load > 80
                  ? 'text-red-500'
                  : agent.load > 50
                    ? 'text-amber-500'
                    : 'text-emerald-500'
              }`}
            >
              {agent.load}%
            </span>
          )}
        </div>

        {/* Load bar */}
        {agent.load !== undefined && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${agent.load}%`,
                backgroundColor: colors.bg,
              }}
            />
          </div>
        )}

        {/* Last activity */}
        <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {formatLastActivity(agent.lastActivity)}
        </div>

        {/* Current task */}
        {agent.currentTask && (
          <div className={`mt-1 truncate text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
            📋 {agent.currentTask}
          </div>
        )}
      </div>
    </div>
  )
})

AgentNode.displayName = 'AgentNode'

const nodeTypes = {
  agentNode: AgentNode,
}

// ============================================================================
// Main Component
// ============================================================================

export function CollaborationGraph({
  agentNodes,
  connections,
  onAgentUpdate,
  onConnectionClick,
  className = '',
  enableRealtime = true,
}: CollaborationGraphProps) {
  const isDark = useDarkMode()

  // Convert agent nodes to flow nodes
  const initialNodes: FlowNode[] = useMemo(() => {
    const nodes: FlowNode[] = agentNodes.map((agent, index) => {
      // Calculate position in a circular layout
      const angle = (index / agentNodes.length) * 2 * Math.PI
      const radius = Math.min(400, 100 + agentNodes.length * 30)
      const x = Math.cos(angle) * radius + 400
      const y = Math.sin(angle) * radius + 300

      return {
        id: agent.id,
        type: 'agentNode',
        position: { x, y },
        data: { agent },
      }
    })

    // Add a central hub node if we have connections
    if (connections.length > 0) {
      nodes.push({
        id: 'hub',
        type: 'default',
        position: { x: 400, y: 300 },
        data: {
          label: (
            <div
              className={`rounded-lg px-3 py-2 ${
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              <div className="text-xs font-medium">任务中心</div>
            </div>
          ),
          agent: {
            id: 'hub',
            name: '任务中心',
            status: 'idle',
            lastActivity: Date.now(),
          },
        } as FlowNodeData,
        style: {
          background: isDark ? '#27272a' : '#f4f4f5',
          border: `2px solid ${isDark ? '#52525b' : '#d4d4d8'}`,
          borderRadius: '8px',
        },
      })
    }

    return nodes
  }, [agentNodes, isDark, connections.length])

  // Convert connections to flow edges
  const initialEdges: FlowEdge[] = useMemo(() => {
    return connections.map((conn, index) => ({
      id: `edge-${index}-${conn.source}-${conn.target}`,
      source: conn.source,
      target: conn.target,
      label: conn.label || conn.taskType,
      style: {
        stroke: isDark ? '#71717a' : '#a1a1aa',
        strokeWidth: 2,
      },
      animated: conn.taskType === 'active',
      data: { connection: conn },
    }))
  }, [connections, isDark])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge(connection, eds))
    },
    [setEdges]
  )

  // Handle edge clicks
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: FlowEdge) => {
      const connection = edge.data?.connection as ConnectionData | undefined
      if (connection && onConnectionClick) {
        onConnectionClick(connection)
      }
    },
    [onConnectionClick]
  )

  // Real-time updates (simulated - replace with actual WebSocket)
  useEffect(() => {
    if (!enableRealtime) return

    const interval = setInterval(() => {
      // Simulate status updates
      setNodes(nds =>
        nds.map(node => {
          if (node.type === 'agentNode' && node.data.agent.status !== 'offline') {
            // Randomly update load
            const randomLoad = Math.floor(Math.random() * 100)
            return {
              ...node,
              data: {
                ...node.data,
                agent: {
                  ...(node.data.agent || {}),
                  load: randomLoad,
                  lastActivity: Date.now(),
                },
              },
            }
          }
          return node
        })
      )
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [enableRealtime, setNodes])

  // Update nodes when agentNodes prop changes
  useEffect(() => {
    setNodes(nds => {
      const nodeMap = new Map(nds.map(n => [n.id, n]))

      return agentNodes
        .map(agent => {
          const existing = nodeMap.get(agent.id)
          if (existing && existing.type === 'agentNode') {
            // Update existing node
            return {
              ...existing,
              data: { agent },
            }
          }
          // This shouldn't happen since we recreate all nodes in initialNodes
          return existing!
        })
        .filter(Boolean) as FlowNode[]
    })
  }, [agentNodes, setNodes])

  // Update edges when connections prop changes
  useEffect(() => {
    setEdges(initialEdges)
  }, [connections, setEdges, initialEdges, isDark])

  // Background variant based on theme
  const backgroundVariant: BackgroundVariant = BackgroundVariant.Dots

  return (
    <div className={`relative h-full w-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="!bg-transparent"
      >
        <Background
          variant={backgroundVariant}
          gap={20}
          size={1}
          color={isDark ? '#3f3f46' : '#d4d4d8'}
        />

        <Controls
          className={`!bg-opacity-90 !backdrop-blur-sm ${isDark ? '!bg-zinc-800' : '!bg-white'} `}
        />

        <MiniMap
          nodeColor={node => {
            if (node.type === 'agentNode') {
              const status = (node.data as FlowNodeData).agent.status
              return STATUS_COLORS[status]?.bg || '#6b7280'
            }
            return isDark ? '#27272a' : '#f4f4f5'
          }}
          className={`!bg-opacity-90 !backdrop-blur-sm ${isDark ? '!bg-zinc-800' : '!bg-white'} `}
        />

        {/* Info Panel */}
        <Panel
          position="top-left"
          className={`!bg-opacity-90 rounded-lg p-3 !backdrop-blur-sm ${isDark ? '!bg-zinc-800 !text-zinc-300' : '!bg-white !text-zinc-700'} `}
        >
          <div className="space-y-1 text-xs">
            <div className="mb-2 font-semibold">图例</div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS.idle.bg }}
              />
              <span>空闲</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS.running.bg }}
              />
              <span>运行中</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS.error.bg }}
              />
              <span>错误</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS.offline.bg }}
              />
              <span>离线</span>
            </div>
          </div>
        </Panel>

        {/* Stats Panel */}
        <Panel
          position="top-right"
          className={`!bg-opacity-90 rounded-lg p-3 !backdrop-blur-sm ${isDark ? '!bg-zinc-800 !text-zinc-300' : '!bg-white !text-zinc-700'} `}
        >
          <div className="space-y-1 text-xs">
            <div className="mb-2 font-semibold">统计</div>
            <div>Agents: {agentNodes.length}</div>
            <div>Connections: {connections.length}</div>
            <div className="text-zinc-500">
              {agentNodes.filter(a => a.status === 'running').length} Running
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default CollaborationGraph
