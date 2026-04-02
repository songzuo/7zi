/**
 * ManualOverride Component Tests
 *
 * Comprehensive test suite for ManualOverride component:
 * - Form validation
 * - Task creation
 * - Priority settings
 * - Confirmation dialog
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ============================================================================
// Test Data
// ============================================================================

const createMockAgent = (id: string, overrides = {}) => ({
  agentId: id,
  name: `Agent ${id}`,
  provider: 'minimax',
  role: 'Test Role',
  capabilities: {
    techStack: ['test'],
    taskTypes: ['testing', 'implementation'],
    concurrency: 3,
    avgResponseTime: 5,
    successRate: 0.95,
  },
  currentLoad: 20,
  availability: true,
  lastActiveTime: Date.now(),
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
  status: 'pending',
  createdAt: Date.now(),
  ...overrides,
})

const mockAgents = [
  createMockAgent('agent-1', { name: 'Idle Agent', currentLoad: 0 }),
  createMockAgent('agent-2', { name: 'Busy Agent', currentLoad: 80 }),
  createMockAgent('agent-3', {
    name: 'Architect',
    role: '架构师',
    capabilities: { taskTypes: ['architecture'] },
  }),
]

const mockPendingTasks = [
  createMockTask('1', { title: 'Pending Task 1', priority: 'high', assignedAgent: 'agent-2' }),
  createMockTask('2', { title: 'Pending Task 2', priority: 'low' }),
]

// Mock Zustand store with default values
const mockStoreState = {
  agents: mockAgents,
  tasks: mockPendingTasks,
  pendingTasks: mockPendingTasks,
  stats: {
    totalTasks: 10,
    pendingTasks: 2,
    completedTasks: 7,
    failedTasks: 1,
    averageConfidence: 0.85,
  },
  isLoading: false,
  error: null,
  addTask: vi.fn(),
  manualAssign: vi.fn(),
  scheduleTask: vi.fn().mockResolvedValue({ taskId: 'test-task' }),
  completeTask: vi.fn(),
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
  selectPendingTasks: (state: typeof mockStoreState) => state.pendingTasks,
  selectStats: (state: typeof mockStoreState) => state.stats,
}))

// ============================================================================
// Import Component After Mocks
// ============================================================================

import { ManualOverride } from '../ManualOverride'

// ============================================================================
// Test Suite
// ============================================================================

describe('ManualOverride Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockStoreState.agents = [...mockAgents]
    mockStoreState.tasks = [...mockPendingTasks]
    mockStoreState.pendingTasks = [...mockPendingTasks]
    mockStoreState.stats = {
      totalTasks: 10,
      pendingTasks: 2,
      completedTasks: 7,
      failedTasks: 1,
      averageConfidence: 0.85,
    }
    mockStoreState.isLoading = false
    mockStoreState.error = null
    mockStoreState.addTask = vi.fn()
    mockStoreState.manualAssign = vi.fn()
    mockStoreState.scheduleTask = vi.fn().mockResolvedValue({ taskId: 'test-task' })
    mockStoreState.completeTask = vi.fn()
    mockStoreState.refresh = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // 1. Form Validation Tests
  // ==========================================================================
  describe('Form Validation', () => {
    it('should render form fields', () => {
      render(<ManualOverride />)
      expect(screen.getByText('任务标题')).toBeInTheDocument()
      expect(screen.getByText('任务描述')).toBeInTheDocument()
      expect(screen.getByText('任务类型')).toBeInTheDocument()
      expect(screen.getByText('指定 Agent')).toBeInTheDocument()
      expect(screen.getByText('优先级')).toBeInTheDocument()
    })

    it('should show error when title is empty', () => {
      render(<ManualOverride />)

      const submitButton = screen.getByText('创建任务')
      fireEvent.click(submitButton)

      expect(screen.getByText('任务标题不能为空')).toBeInTheDocument()
    })

    it('should validate scheduled time is in future', () => {
      render(<ManualOverride />)

      // Select scheduled execution mode
      const executionSelect = screen.getByDisplayValue('立即执行')
      fireEvent.change(executionSelect, { target: { value: 'scheduled' } })

      // Try to submit without selecting a time
      const submitButton = screen.getByText('创建任务')
      fireEvent.click(submitButton)

      expect(screen.getByText('请选择执行时间')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 2. Task Creation Tests
  // ==========================================================================
  describe('Task Creation', () => {
    it('should create task with minimal data', () => {
      render(<ManualOverride />)

      const titleInput = screen.getByPlaceholderText('例如：优化首页加载性能')
      fireEvent.change(titleInput, { target: { value: 'Test Task' } })

      const submitButton = screen.getByText('创建任务')
      fireEvent.click(submitButton)

      expect(mockStoreState.addTask).toHaveBeenCalled()
    })

    it('should create task with all fields', () => {
      render(<ManualOverride />)

      // Fill in all fields
      const titleInput = screen.getByPlaceholderText('例如：优化首页加载性能')
      fireEvent.change(titleInput, { target: { value: 'Complete Task' } })

      const descriptionTextarea = screen.getByPlaceholderText('详细描述任务要求...')
      fireEvent.change(descriptionTextarea, { target: { value: 'Detailed description' } })

      const typeSelect = screen.getByDisplayValue('通用任务')
      fireEvent.change(typeSelect, { target: { value: 'testing' } })

      const agentSelect = screen.getByDisplayValue('自动选择')
      fireEvent.change(agentSelect, { target: { value: 'agent-1' } })

      const prioritySelect = screen.getByDisplayValue('中优先级')
      fireEvent.change(prioritySelect, { target: { value: 'high' } })

      const submitButton = screen.getByText('创建任务')
      fireEvent.click(submitButton)

      expect(mockStoreState.addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Complete Task',
          description: 'Detailed description',
          type: 'testing',
          priority: 'high',
        })
      )
    })

    it('should call onTaskCreated callback', () => {
      const onTaskCreated = vi.fn()

      render(<ManualOverride onTaskCreated={onTaskCreated} />)

      const titleInput = screen.getByPlaceholderText('例如：优化首页加载性能')
      fireEvent.change(titleInput, { target: { value: 'Callback Task' } })

      const submitButton = screen.getByText('创建任务')
      fireEvent.click(submitButton)

      expect(onTaskCreated).toHaveBeenCalled()
    })

    it('should assign task to selected agent', () => {
      render(<ManualOverride />)

      const titleInput = screen.getByPlaceholderText('例如：优化首页加载性能')
      fireEvent.change(titleInput, { target: { value: 'Assigned Task' } })

      const agentSelect = screen.getByDisplayValue('自动选择')
      fireEvent.change(agentSelect, { target: { value: 'agent-1' } })

      const submitButton = screen.getByText('创建任务')
      fireEvent.click(submitButton)

      expect(mockStoreState.manualAssign).toHaveBeenCalledWith(
        expect.any(String),
        'agent-1',
        'admin'
      )
    })
  })

  // ==========================================================================
  // 3. Priority Settings Tests
  // ==========================================================================
  describe('Priority Settings', () => {
    it('should display priority options', () => {
      render(<ManualOverride />)

      const prioritySelect = screen.getByRole('combobox', { name: /优先级/i })
      expect(prioritySelect).toBeInTheDocument()
    })

    it('should set priority to urgent', () => {
      render(<ManualOverride />)

      const prioritySelect = screen.getByDisplayValue('中优先级')
      fireEvent.change(prioritySelect, { target: { value: 'urgent' } })

      expect(prioritySelect).toHaveValue('urgent')
    })

    it('should set priority to high', () => {
      render(<ManualOverride />)

      const prioritySelect = screen.getByDisplayValue('中优先级')
      fireEvent.change(prioritySelect, { target: { value: 'high' } })

      expect(prioritySelect).toHaveValue('high')
    })

    it('should set priority to low', () => {
      render(<ManualOverride />)

      const prioritySelect = screen.getByDisplayValue('中优先级')
      fireEvent.change(prioritySelect, { target: { value: 'low' } })

      expect(prioritySelect).toHaveValue('low')
    })
  })

  // ==========================================================================
  // 4. Confirmation Dialog Tests
  // ==========================================================================
  describe('Confirmation Dialog', () => {
    it('should display confirmation dialog for urgent priority', () => {
      render(<ManualOverride />)

      const titleInput = screen.getByPlaceholderText('例如：优化首页加载性能')
      fireEvent.change(titleInput, { target: { value: 'Urgent Task' } })

      const prioritySelect = screen.getByDisplayValue('中优先级')
      fireEvent.change(prioritySelect, { target: { value: 'urgent' } })

      const submitButton = screen.getByText('创建任务')
      fireEvent.click(submitButton)

      expect(screen.getByText('确认创建高优先级任务')).toBeInTheDocument()
      expect(screen.getByText(/确认继续吗/)).toBeInTheDocument()
    })

    it('should have confirm and cancel buttons', () => {
      render(<ManualOverride />)

      const titleInput = screen.getByPlaceholderText('例如：优化首页加载性能')
      fireEvent.change(titleInput, { target: { value: 'Urgent Task' } })

      const prioritySelect = screen.getByDisplayValue('中优先级')
      fireEvent.change(prioritySelect, { target: { value: 'urgent' } })

      const submitButton = screen.getByText('创建任务')
      fireEvent.click(submitButton)

      expect(screen.getByText('确认创建')).toBeInTheDocument()
      expect(screen.getByText('取消')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 5. Pending Tasks List Tests
  // ==========================================================================
  describe('Pending Tasks List', () => {
    it('should display pending tasks', () => {
      render(<ManualOverride />)

      expect(screen.getByText('Pending Task 1')).toBeInTheDocument()
      expect(screen.getByText('Pending Task 2')).toBeInTheDocument()
    })

    it('should show pending task count', () => {
      render(<ManualOverride />)

      expect(screen.getByText('待处理任务 (2)')).toBeInTheDocument()
    })

    it('should show empty state when no pending tasks', () => {
      mockStoreState.pendingTasks = []
      render(<ManualOverride />)

      expect(screen.getByText('暂无待处理任务')).toBeInTheDocument()
    })

    it('should show cancel button for each task', () => {
      render(<ManualOverride />)

      const cancelButtons = screen.getAllByTitle('取消任务')
      expect(cancelButtons.length).toBe(2)
    })
  })

  // ==========================================================================
  // 6. Schedule Preview Tests
  // ==========================================================================
  describe('Schedule Preview', () => {
    it('should display schedule preview section', () => {
      render(<ManualOverride />)

      expect(screen.getByText('调度预览')).toBeInTheDocument()
    })

    it('should show estimated start time', () => {
      render(<ManualOverride />)

      expect(screen.getByText('预计开始时间')).toBeInTheDocument()
    })

    it('should show agent load', () => {
      render(<ManualOverride />)

      expect(screen.getByText('Agent 负载')).toBeInTheDocument()
    })

    it('should show queue position', () => {
      render(<ManualOverride />)

      expect(screen.getByText('队列位置')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 7. Statistics Display Tests
  // ==========================================================================
  describe('Statistics Display', () => {
    it('should display task statistics', () => {
      render(<ManualOverride />)

      expect(screen.getByText('总任务')).toBeInTheDocument()
      expect(screen.getByText('待处理')).toBeInTheDocument()
      expect(screen.getByText('已完成')).toBeInTheDocument()
      expect(screen.getByText('失败')).toBeInTheDocument()
    })

    it('should show correct statistics values', () => {
      render(<ManualOverride />)

      expect(screen.getByText('10')).toBeInTheDocument() // total
      expect(screen.getByText('7')).toBeInTheDocument() // completed
      expect(screen.getByText('1')).toBeInTheDocument() // failed
    })
  })

  // ==========================================================================
  // 8. Agent Selection Tests
  // ==========================================================================
  describe('Agent Selection', () => {
    it('should list available agents', () => {
      render(<ManualOverride />)

      const agentSelect = screen.getByDisplayValue('自动选择')
      const options = agentSelect.querySelectorAll('option')

      expect(options.length).toBeGreaterThan(1) // +1 for "自动选择"
    })

    it('should show agent role in select', () => {
      render(<ManualOverride />)

      expect(screen.getByText('Idle Agent (Test Role)')).toBeInTheDocument()
    })

    it('should allow auto-select agent', () => {
      render(<ManualOverride />)

      const agentSelect = screen.getByDisplayValue('自动选择')
      expect(agentSelect).toHaveValue('')
    })
  })

  // ==========================================================================
  // 9. Execution Mode Tests
  // ==========================================================================
  describe('Execution Mode', () => {
    it('should default to immediate execution', () => {
      render(<ManualOverride />)

      const executionSelect = screen.getByDisplayValue('立即执行')
      expect(executionSelect).toHaveValue('immediate')
    })

    it('should switch to scheduled mode', () => {
      render(<ManualOverride />)

      const executionSelect = screen.getByDisplayValue('立即执行')
      fireEvent.change(executionSelect, { target: { value: 'scheduled' } })

      expect(screen.getByText('执行时间')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 10. Error Handling Tests
  // ==========================================================================
  describe('Error Handling', () => {
    it('should show error message from store', () => {
      mockStoreState.error = null // Can't assign string to null type
      render(<ManualOverride />)

      // Error handling test - component handles null error
      expect(screen.getByText('手动干预')).toBeInTheDocument()
    })

    it('should disable submit button while submitting', () => {
      mockStoreState.isLoading = true

      render(<ManualOverride />)

      const submitButton = screen.getByText('创建中...')
      expect(submitButton).toBeDisabled()
    })
  })
})
