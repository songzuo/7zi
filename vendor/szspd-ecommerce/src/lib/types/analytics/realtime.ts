/**
 * Real-time Analytics Types
 * 实时数据分析类型定义
 */

// ============================================================================
// WebSocket Connection Status
// ============================================================================

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

export interface WebSocketConnectionMetrics {
  status: WebSocketStatus
  connectedAt?: string
  lastPing?: string
  latency?: number
  reconnectAttempts: number
  messagesReceived: number
  messagesSent: number
  lastError?: string
}

// ============================================================================
// Real-time Task Status Distribution
// ============================================================================

export interface TaskStatusDistribution {
  timestamp: string
  statuses: {
    submitted: number
    running: number
    completed: number
    failed: number
    cancelled: number
    pending: number
  }
  changes?: {
    status: string
    delta: number
  }[]
}

export interface TaskStatusHistoryPoint {
  timestamp: string
  submitted: number
  running: number
  completed: number
  failed: number
  cancelled: number
  pending: number
}

// ============================================================================
// Team Efficiency Metrics
// ============================================================================

export interface TeamEfficiencyMetrics {
  timestamp: string
  agentsOnline: number
  agentsIdle: number
  agentsWorking: number
  tasksPerHour: number
  averageTaskDuration: number
  taskSuccessRate: number
  throughput: number
  queueSize: number
}

export interface AgentEfficiencyRecord {
  agentId: string
  agentName: string
  status: 'online' | 'offline' | 'busy' | 'idle'
  tasksCompleted: number
  averageResponseTime: number
  tokensUsed: number
  uptime: number
  lastActive: string
}

// ============================================================================
// Real-time Performance Metrics
// ============================================================================

export interface RealtimePerformanceMetrics {
  timestamp: string
  cpuUsage: number
  memoryUsage: number
  networkLatency: number
  requestsPerSecond: number
  activeConnections: number
  queueLength: number
  errorRate: number
}

// ============================================================================
// Real-time Update Message
// ============================================================================

export interface RealtimeUpdateMessage {
  type: 'metrics_update' | 'task_status_update' | 'performance_update' | 'efficiency_update'
  timestamp: string
  data:
    | TaskStatusDistribution
    | TeamEfficiencyMetrics
    | RealtimePerformanceMetrics
    | WebSocketConnectionMetrics
}

// ============================================================================
// Real-time Data State
// ============================================================================

export interface RealtimeAnalyticsState {
  connection: WebSocketConnectionMetrics
  taskDistribution: TaskStatusDistribution
  teamEfficiency: TeamEfficiencyMetrics
  performance: RealtimePerformanceMetrics
  history: {
    taskStatus: TaskStatusHistoryPoint[]
    efficiency: TeamEfficiencyMetrics[]
  }
}

// ============================================================================
// WebSocket Configuration
// ============================================================================

export interface RealtimeWebSocketConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  enabledMetrics?: ('connection' | 'task_distribution' | 'team_efficiency' | 'performance')[]
}
