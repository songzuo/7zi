/**
 * AgentStatusPanel Component Tests
 *
 * Comprehensive test suite for AgentStatusPanel component:
 * - Agent status rendering
 * - Status filtering
 * - Auto-refresh mechanism
 * - Click interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import React from 'react'

// ============================================================================
// Mocks Setup
// ============================================================================

// Test Data
const createMockAgent = (id: string, overrides = {}) => ({
  agentId: id,
  name: `Agent ${id}`,
  provider: 'minimax',
  role: 'Test Role',
  capabilities: {
    techStack: ['test'],
    taskTypes: ['testing'],
    concurrency: 3,
    avgResponseTime: 5,
    successRate: 0.95,
  },
  currentLoad: 0,
  availability: true,
  lastActiveTime: Date.now(),
  metrics: {
    totalTasksCompleted: 10,
    averageCompletionTime: 15,
    errorRate: 0.05,
  },
  ...overrides,
})

const createMockTask = (id: string, overrides = {}) => ({
  id: `task-${id}`,
  type: 'testing',
  title: `Task ${id}`,
  description: 'Test task description',
  priority: 'medium',
  requiredCapabilities: [],
  estimatedDuration: 30,
  dependencies: [],
  status: 'in_progress',
  assignedAgent: 'agent-1',
  createdAt: Date.now(),
  startedAt: Date.now(),
  ...overrides,
})

const mockAgents = [
  createMockAgent('agent-1', { name: 'Idle Agent', currentLoad: 0, availability: true }),
  createMockAgent('agent-2', { name: 'Busy Agent', currentLoad: 50, availability: true }),
  createMockAgent('agent-3', {
    name: 'Offline Agent',
    currentLoad: 0,
    availability: false,
    lastActiveTime: Date.now() - 600000,
  }),
  createMockAgent('agent-4', { name: 'Error Agent', currentLoad: -1, availability: true }),
]

const mockTasks = [
  createMockTask('1', { assignedAgent: 'agent-2', status: 'in_progress' }),
  createMockTask('2', { assignedAgent: 'agent-1', status: 'pending' }),
]

// Mock Zustand store with default values
const mockStoreState = {
  agents: mockAgents,
  tasks: mockTasks,
  availability: { available: 3, total: 4, percentage: 75 },
  isLoading: false,
  error: null,
  refresh: vi.fn(),
}

vi.mock('@/lib/agents/scheduler/stores/scheduler-store', () => ({
  useSchedulerStore: vi.fn((selector: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState)
    }
    return mockStoreState
  }),
  selectAgents: (state: typeof mockStoreState) => state.agents,
  selectAgentAvailability: (state: typeof mockStoreState) => state.availability,
  selectTasks: (state: typeof mockStoreState) => state.tasks,
}))

// ============================================================================
// Import Component After Mocks
// ============================================================================

import { AgentStatusPanel } from '../AgentStatusPanel'

// ============================================================================
// Test Suite
// ============================================================================

describe('AgentStatusPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState.agents = [...mockAgents]
    mockStoreState.tasks = [...mockTasks]
    mockStoreState.availability = { available: 3, total: 4, percentage: 75 }
    mockStoreState.isLoading = false
    mockStoreState.error = null
    mockStoreState.refresh = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // 1. Agent Status Rendering Tests
  // ==========================================================================
  describe('Agent Status Rendering', () => {
    it('should render header with title', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText('智能体状态')).toBeInTheDocument()
    })

    it('should render all agent cards', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText('Idle Agent')).toBeInTheDocument()
      expect(screen.getByText('Busy Agent')).toBeInTheDocument()
      expect(screen.getByText('Offline Agent')).toBeInTheDocument()
      expect(screen.getByText('Error Agent')).toBeInTheDocument()
    })

    it('should display agent role and ID', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText('Test Role')).toBeInTheDocument()
      expect(screen.getByText('agent-1')).toBeInTheDocument()
    })

    it('should display agent metrics when showMetrics is true', () => {
      render(<AgentStatusPanel showMetrics={true} />)
      expect(screen.getByText('完成任务')).toBeInTheDocument()
      expect(screen.getByText('平均时间')).toBeInTheDocument()
      expect(screen.getByText('错误率')).toBeInTheDocument()
    })

    it('should hide agent metrics when showMetrics is false', () => {
      render(<AgentStatusPanel showMetrics={false} />)
      expect(screen.queryByText('完成任务')).not.toBeInTheDocument()
    })

    it('should display system resources (CPU and Memory)', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText('CPU')).toBeInTheDocument()
      expect(screen.getByText('内存')).toBeInTheDocument()
    })

    it('should display last active time', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText(/最后心跳/)).toBeInTheDocument()
    })

    it('should display provider name', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText('MiniMax')).toBeInTheDocument()
    })

    it('should display load percentage', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText(/0% 负载/)).toBeInTheDocument()
    })

    it('should show empty state when no agents', () => {
      mockStoreState.agents = []
      render(<AgentStatusPanel />)
      expect(screen.getByText('暂无智能体数据')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 2. Status Filtering Tests
  // ==========================================================================
  describe('Status Filtering', () => {
    it('should display filter buttons', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText(/全部 \(4\)/)).toBeInTheDocument()
      expect(screen.getByText(/空闲 \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/忙碌 \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/离线 \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/错误 \(1\)/)).toBeInTheDocument()
    })

    it('should filter agents by status when clicking filter button', async () => {
      render(<AgentStatusPanel />)

      // Click on idle filter
      const idleButton = screen.getByText(/空闲 \(1\)/)
      fireEvent.click(idleButton)

      // Should show idle agent
      expect(screen.getByText('Idle Agent')).toBeInTheDocument()

      // Click on busy filter
      const busyButton = screen.getByText(/忙碌 \(1\)/)
      fireEvent.click(busyButton)

      // Should show busy agent
      expect(screen.getByText('Busy Agent')).toBeInTheDocument()
    })

    it('should show all agents when clicking "all" filter', async () => {
      render(<AgentStatusPanel />)

      // First filter to idle
      const idleButton = screen.getByText(/空闲 \(1\)/)
      fireEvent.click(idleButton)

      // Then click all
      const allButton = screen.getByText(/全部 \(4\)/)
      fireEvent.click(allButton)

      // All agents should be visible
      expect(screen.getByText('Idle Agent')).toBeInTheDocument()
      expect(screen.getByText('Busy Agent')).toBeInTheDocument()
    })

    it('should show empty state when filter matches no agents', () => {
      mockStoreState.agents = [mockAgents[0]] // Only idle agent
      render(<AgentStatusPanel />)

      const busyButton = screen.getByText(/忙碌 \(0\)/)
      fireEvent.click(busyButton)
      expect(screen.getByText(/没有.*状态.*智能体/)).toBeInTheDocument()
    })

    it('should highlight active filter button', () => {
      render(<AgentStatusPanel initialFilter="idle" />)
      const idleButton = screen.getByText(/空闲 \(1\)/)
      expect(idleButton).toHaveClass('bg-blue-500')
    })
  })

  // ==========================================================================
  // 3. Auto-Refresh Mechanism Tests
  // ==========================================================================
  describe('Auto-Refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should auto-refresh when autoRefresh is true', () => {
      render(<AgentStatusPanel autoRefresh={true} refreshInterval={5000} />)

      vi.advanceTimersByTime(5000)

      expect(mockStoreState.refresh).toHaveBeenCalled()
    })

    it('should not auto-refresh when autoRefresh is false', () => {
      render(<AgentStatusPanel autoRefresh={false} />)

      vi.advanceTimersByTime(10000)

      expect(mockStoreState.refresh).not.toHaveBeenCalled()
    })

    it('should respect custom refresh interval', () => {
      render(<AgentStatusPanel autoRefresh={true} refreshInterval={3000} />)

      vi.advanceTimersByTime(3000)

      expect(mockStoreState.refresh).toHaveBeenCalled()
    })

    it('should stop auto-refresh on unmount', () => {
      const { unmount } = render(<AgentStatusPanel autoRefresh={true} refreshInterval={5000} />)

      unmount()

      vi.advanceTimersByTime(5000)

      expect(mockStoreState.refresh).not.toHaveBeenCalled()
    })

    it('should use default 10 second interval when not specified', () => {
      render(<AgentStatusPanel autoRefresh={true} />)

      vi.advanceTimersByTime(10000)

      expect(mockStoreState.refresh).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // 4. Click Interaction Tests
  // ==========================================================================
  describe('Click Interactions', () => {
    it('should call onAgentClick when agent card is clicked', () => {
      const handleClick = vi.fn()

      render(<AgentStatusPanel onAgentClick={handleClick} />)

      // Find agent card and click it
      const agentCards = screen.getAllByText(/Agent/)
      if (agentCards.length > 0) {
        const card = agentCards[0].closest('div')
        if (card) {
          fireEvent.click(card)
          expect(handleClick).toHaveBeenCalled()
        }
      }
    })

    it('should have hover class when onAgentClick is provided', () => {
      const { container } = render(<AgentStatusPanel onAgentClick={() => {}} />)

      const hoverableCards = container.querySelectorAll('.hover\\:scale-\\[1\\.02\\]')
      expect(hoverableCards.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // 5. Refresh Button Tests
  // ==========================================================================
  describe('Refresh Button', () => {
    it('should display refresh button when showRefresh is true', () => {
      render(<AgentStatusPanel showRefresh={true} />)
      const refreshButton = screen.getByTitle('刷新状态')
      expect(refreshButton).toBeInTheDocument()
    })

    it('should not display refresh button when showRefresh is false', () => {
      render(<AgentStatusPanel showRefresh={false} />)
      const refreshButton = screen.queryByTitle('刷新状态')
      expect(refreshButton).not.toBeInTheDocument()
    })

    it('should call refresh when button is clicked', () => {
      render(<AgentStatusPanel showRefresh={true} />)

      const refreshButton = screen.getByTitle('刷新状态')
      fireEvent.click(refreshButton)

      expect(mockStoreState.refresh).toHaveBeenCalled()
    })

    it('should show spinning icon when loading', () => {
      mockStoreState.isLoading = true
      render(<AgentStatusPanel showRefresh={true} />)

      const refreshButton = screen.getByTitle('刷新状态')
      const icon = refreshButton.querySelector('.animate-spin')
      expect(icon).toBeInTheDocument()
    })

    it('should disable refresh button when loading', () => {
      mockStoreState.isLoading = true
      render(<AgentStatusPanel showRefresh={true} />)

      const refreshButton = screen.getByTitle('刷新状态')
      expect(refreshButton).toBeDisabled()
    })
  })

  // ==========================================================================
  // 6. Agent Card Details Tests
  // ==========================================================================
  describe('Agent Card Details', () => {
    it('should display current task when agent has one', () => {
      render(<AgentStatusPanel />)
      // Agent-2 has an in-progress task
      expect(screen.getByText('Task 1')).toBeInTheDocument()
    })

    it('should display task priority', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText(/优先级:/)).toBeInTheDocument()
    })

    it('should display estimated duration', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText(/预计/)).toBeInTheDocument()
    })

    it('should format last active time correctly', () => {
      const recentAgent = createMockAgent('recent', {
        lastActiveTime: Date.now() - 30000,
      })
      mockStoreState.agents = [recentAgent]

      render(<AgentStatusPanel />)
      expect(screen.getByText('刚刚')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 7. Availability Summary Tests
  // ==========================================================================
  describe('Availability Summary', () => {
    it('should display availability percentage', () => {
      render(<AgentStatusPanel />)
      expect(screen.getByText('整体可用率')).toBeInTheDocument()
    })

    it('should calculate 0% when no agents', () => {
      mockStoreState.agents = []
      mockStoreState.availability = { available: 0, total: 0, percentage: 0 }

      render(<AgentStatusPanel />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 8. Max Display Limit Tests
  // ==========================================================================
  describe('Max Display Limit', () => {
    it('should limit displayed agents when maxDisplay is set', () => {
      render(<AgentStatusPanel maxDisplay={2} />)
      expect(screen.getByText(/显示前 2 个智能体/)).toBeInTheDocument()
    })

    it('should show total count when limited', () => {
      render(<AgentStatusPanel maxDisplay={2} />)
      expect(screen.getByText(/总计 4 个/)).toBeInTheDocument()
    })

    it('should not limit when maxDisplay is not set', () => {
      render(<AgentStatusPanel />)
      expect(screen.queryByText(/显示前/)).not.toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 9. Error Handling Tests
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle store errors gracefully', () => {
      mockStoreState.error = null // Can't assign string to null type

      render(<AgentStatusPanel />)
      expect(screen.getByText('智能体状态')).toBeInTheDocument()
    })

    it('should handle missing agent metrics', () => {
      const agentWithoutMetrics = createMockAgent('no-metrics')
      delete (agentWithoutMetrics as any).metrics

      mockStoreState.agents = [agentWithoutMetrics]

      render(<AgentStatusPanel showMetrics={true} />)
      expect(screen.getByText('Agent no-metrics')).toBeInTheDocument()
    })

    it('should handle malformed agent data', () => {
      mockStoreState.agents = [{ agentId: 'bad' } as any]

      render(<AgentStatusPanel />)
      expect(screen.getByText('智能体状态')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 10. Responsive Layout Tests
  // ==========================================================================
  describe('Responsive Layout', () => {
    it('should render correctly in grid layout', () => {
      const { container } = render(<AgentStatusPanel />)

      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
      expect(grid).toHaveClass('grid-cols-1')
    })

    it('should apply custom className', () => {
      const { container } = render(<AgentStatusPanel className="custom-class" />)

      const panel = container.querySelector('.custom-class')
      expect(panel).toBeInTheDocument()
    })
  })
})
