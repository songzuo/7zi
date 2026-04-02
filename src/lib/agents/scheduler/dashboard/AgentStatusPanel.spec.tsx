/**
 * AgentStatusPanel.spec.tsx
 * Tests for AgentStatusPanel component
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AgentStatusPanel } from './AgentStatusPanel'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Activity: ({ className }: { className?: string }) => (
    <span data-testid="activity-icon" className={className} />
  ),
  Users: ({ className }: { className?: string }) => (
    <span data-testid="users-icon" className={className} />
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <span data-testid="alert-icon" className={className} />
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <span data-testid="check-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <span data-testid="clock-icon" className={className} />
  ),
  Zap: ({ className }: { className?: string }) => (
    <span data-testid="zap-icon" className={className} />
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <span data-testid="trending-icon" className={className} />
  ),
  Filter: ({ className }: { className?: string }) => (
    <span data-testid="filter-icon" className={className} />
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <span data-testid="refresh-icon" className={className} />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <span data-testid="chevron-down-icon" className={className} />
  ),
  ChevronUp: ({ className }: { className?: string }) => (
    <span data-testid="chevron-up-icon" className={className} />
  ),
}))

// Mock scheduler store - create a complete mock
const mockInitialize = vi.fn()
const mockRefresh = vi.fn()

const mockState = {
  scheduler: null,
  agents: [
    {
      agentId: 'architect',
      name: '架构师',
      provider: 'self-claude',
      role: '架构设计',
      capabilities: {
        techStack: ['typescript', 'react', 'nextjs'],
        taskTypes: ['architecture', 'implementation'],
        concurrency: 2,
        avgResponseTime: 12,
        successRate: 0.96,
      },
      currentLoad: 45,
      availability: true,
      lastActiveTime: Date.now(),
    },
  ],
  tasks: [],
  pendingTasks: [],
  recentDecisions: [],
  selectedTaskId: null,
  selectedAgentId: null,
  isLoading: false,
  error: null,
  stats: {
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageConfidence: 0,
  },
  initialize: mockInitialize,
  refresh: mockRefresh,
  addTask: vi.fn(),
  addTasks: vi.fn(),
  selectTask: vi.fn(),
  selectAgent: vi.fn(),
  completeTask: vi.fn(),
  failTask: vi.fn(),
  scheduleTask: vi.fn(),
  scheduleNextBatch: vi.fn(),
  manualAssign: vi.fn(),
  setAgentAvailability: vi.fn(),
  clearError: vi.fn(),
  updateConfig: vi.fn(),
  getState: vi.fn(() => mockState),
}

vi.mock('../stores/scheduler-store', () => {
  const mockStore = vi.fn(selector => {
    if (selector) {
      return selector(mockState)
    }
    return mockState
  })
  ;(mockStore as any).getState = () => mockState

  return {
    useSchedulerStore: mockStore,
    selectAgentAvailability: vi.fn(() => ({ available: 1, total: 11, percentage: 9 })),
    selectAgentUtilization: vi.fn(() => []),
  }
})

describe('AgentStatusPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render component', () => {
    render(<AgentStatusPanel />)
    expect(screen.getByText('Agent 状态面板')).toBeInTheDocument()
  })

  it('should display statistics summary', async () => {
    render(<AgentStatusPanel />)
    await waitFor(() => {
      expect(screen.getByText('Agent 状态总览')).toBeInTheDocument()
    })
  })

  it('should render filter dropdown', () => {
    render(<AgentStatusPanel />)
    expect(screen.getByText('全部角色')).toBeInTheDocument()
  })

  it('should have refresh button', () => {
    render(<AgentStatusPanel />)
    expect(screen.getByText('刷新')).toBeInTheDocument()
  })

  it('should call initialize on mount', () => {
    render(<AgentStatusPanel />)
    expect(mockInitialize).toHaveBeenCalled()
  })

  it('should call refresh when refresh button is clicked', async () => {
    render(<AgentStatusPanel />)
    const refreshButton = screen.getByText('刷新')
    fireEvent.click(refreshButton)
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
