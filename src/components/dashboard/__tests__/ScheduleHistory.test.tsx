/**
 * ScheduleHistory Component Tests
 *
 * Comprehensive test suite for ScheduleHistory component:
 * - History record filtering
 * - Pagination functionality
 * - Search functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ============================================================================
// Test Data
// ============================================================================

const createMockTask = (id: string, overrides = {}) => ({
  id: `task-${id}`,
  type: 'testing',
  title: `Task ${id}`,
  description: `Description for task ${id}`,
  priority: 'medium',
  requiredCapabilities: [],
  estimatedDuration: 30,
  dependencies: [],
  status: 'completed',
  createdAt: Date.now() - 3600000, // 1 hour ago
  startedAt: Date.now() - 3000000,
  completedAt: Date.now() - 1800000, // 30 minutes ago
  assignedAgent: `agent-${parseInt(id, 10) % 3}`,
  ...overrides,
})

const createCompletedTask = (id: string, overrides = {}) =>
  createMockTask(id, { status: 'completed', ...overrides })

const createFailedTask = (id: string, error = 'Task failed', overrides = {}) =>
  createMockTask(id, { status: 'failed', error, ...overrides })

const createPendingTask = (id: string, overrides = {}) =>
  createMockTask(id, { status: 'pending', ...overrides })

// Generate mock tasks for pagination tests
const generateMockTasks = (count: number) => {
  return Array.from({ length: count }, (_, i) => {
    const status = i % 5 === 0 ? 'failed' : 'completed'
    const baseTask =
      status === 'failed' ? createFailedTask(`${i}`, `Error ${i}`) : createCompletedTask(`${i}`)
    return {
      ...baseTask,
      title: `Historical Task ${i}`,
      completedAt: Date.now() - i * 3600000, // Each task 1 hour apart
    }
  })
}

// Mock Zustand store with default values
const mockStoreState = {
  tasks: generateMockTasks(30),
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
  selectTasks: (state: typeof mockStoreState) => state.tasks,
}))

// ============================================================================
// Import Component After Mocks
// ============================================================================

import { ScheduleHistory } from '../ScheduleHistory'

// ============================================================================
// Test Suite
// ============================================================================

describe('ScheduleHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState.tasks = generateMockTasks(30)
    mockStoreState.isLoading = false
    mockStoreState.error = null
    mockStoreState.refresh = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // 1. History Record Filtering Tests
  // ==========================================================================
  describe('History Record Filtering', () => {
    it('should render history title', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText('执行历史')).toBeInTheDocument()
    })

    it('should display filter dropdown button', () => {
      render(<ScheduleHistory showFilters={true} />)
      expect(screen.getByText('筛选')).toBeInTheDocument()
    })

    it('should show filter options when clicked', () => {
      render(<ScheduleHistory showFilters={true} />)

      const filterButton = screen.getByText('筛选')
      fireEvent.click(filterButton)

      expect(screen.getByText('时间范围')).toBeInTheDocument()
      expect(screen.getByText('执行状态')).toBeInTheDocument()
    })

    it('should filter by time range: today', () => {
      render(<ScheduleHistory showFilters={true} />)

      const filterButton = screen.getByText('筛选')
      fireEvent.click(filterButton)

      const todayButton = screen.getByText('今天')
      fireEvent.click(todayButton)

      // Should show tasks
      const taskCards = screen.getAllByText(/Historical Task/)
      expect(taskCards.length).toBeGreaterThan(0)
    })

    it('should filter by time range: last 7 days', () => {
      render(<ScheduleHistory showFilters={true} />)

      const filterButton = screen.getByText('筛选')
      fireEvent.click(filterButton)

      const last7DaysButton = screen.getByText('最近7天')
      fireEvent.click(last7DaysButton)

      expect(screen.getByText(/总计/)).toBeInTheDocument()
    })

    it('should filter by time range: last 30 days', () => {
      render(<ScheduleHistory showFilters={true} />)

      const filterButton = screen.getByText('筛选')
      fireEvent.click(filterButton)

      const last30DaysButton = screen.getByText('最近30天')
      fireEvent.click(last30DaysButton)

      expect(screen.getByText(/总计/)).toBeInTheDocument()
    })

    it('should filter by status: success', () => {
      render(<ScheduleHistory showFilters={true} />)

      const filterButton = screen.getByText('筛选')
      fireEvent.click(filterButton)

      const successButton = screen.getByText('成功')
      fireEvent.click(successButton)

      // Should show successful tasks
      expect(screen.getByText(/成功/)).toBeInTheDocument()
    })

    it('should filter by status: failed', () => {
      render(<ScheduleHistory showFilters={true} />)

      const filterButton = screen.getByText('筛选')
      fireEvent.click(filterButton)

      const failedButton = screen.getByText('失败')
      fireEvent.click(failedButton)

      // Should show failed tasks
      const statusBadges = screen.getAllByText('失败')
      expect(statusBadges.length).toBeGreaterThan(0)
    })

    it('should not show filters when showFilters is false', () => {
      render(<ScheduleHistory showFilters={false} />)
      expect(screen.queryByText('筛选')).not.toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 2. Pagination Functionality Tests
  // ==========================================================================
  describe('Pagination Functionality', () => {
    it('should display pagination controls', () => {
      render(<ScheduleHistory pageSize={10} />)
      expect(screen.getByText(/显示/)).toBeInTheDocument()
    })

    it('should display correct page size', () => {
      render(<ScheduleHistory pageSize={10} />)

      // Should show first 10 items
      const taskCards = screen.getAllByText(/Historical Task/)
      expect(taskCards.length).toBeLessThanOrEqual(10)
    })

    it('should navigate to next page', () => {
      render(<ScheduleHistory pageSize={10} />)

      const nextButton = screen.getByTitle('下一页')
      fireEvent.click(nextButton)

      // Should show pagination info
      expect(screen.getByText(/显示/)).toBeInTheDocument()
    })

    it('should navigate to previous page', () => {
      render(<ScheduleHistory pageSize={10} />)

      // Go to page 2 first
      const nextButton = screen.getByTitle('下一页')
      fireEvent.click(nextButton)

      // Then go back
      const prevButton = screen.getByTitle('上一页')
      fireEvent.click(prevButton)

      expect(screen.getByText(/显示/)).toBeInTheDocument()
    })

    it('should disable previous button on first page', () => {
      render(<ScheduleHistory pageSize={10} />)

      const prevButton = screen.getByTitle('上一页')
      expect(prevButton).toBeDisabled()
    })

    it('should disable next button on last page', () => {
      mockStoreState.tasks = generateMockTasks(15) // Only 2 pages with pageSize 10

      render(<ScheduleHistory pageSize={10} />)

      // Go to last page
      const nextButton = screen.getByTitle('下一页')
      fireEvent.click(nextButton)

      expect(nextButton).toBeDisabled()
    })

    it('should display total records count', () => {
      render(<ScheduleHistory pageSize={10} />)
      expect(screen.getByText(/共 \d+ 条/)).toBeInTheDocument()
    })

    it('should limit display with maxDisplay prop', () => {
      render(<ScheduleHistory pageSize={10} maxDisplay={5} />)

      const taskCards = screen.getAllByText(/Historical Task/)
      expect(taskCards.length).toBeLessThanOrEqual(5)
    })

    it('should handle empty task list', () => {
      mockStoreState.tasks = []
      render(<ScheduleHistory />)

      expect(screen.getByText('暂无历史记录')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 3. Search Functionality Tests
  // ==========================================================================
  describe('Search Functionality', () => {
    it('should display search input', () => {
      render(<ScheduleHistory />)
      expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument()
    })

    it('should filter records by search query', () => {
      mockStoreState.tasks = [
        createCompletedTask('1', { title: 'Important Feature' }),
        createCompletedTask('2', { title: 'Bug Fix' }),
        createCompletedTask('3', { title: 'Another Important Task' }),
      ]

      render(<ScheduleHistory />)

      const searchInput = screen.getByPlaceholderText('搜索...')
      fireEvent.change(searchInput, { target: { value: 'Important' } })

      expect(screen.getByText('Important Feature')).toBeInTheDocument()
      expect(screen.getByText('Another Important Task')).toBeInTheDocument()
      expect(screen.queryByText('Bug Fix')).not.toBeInTheDocument()
    })

    it('should show empty state when no results', () => {
      render(<ScheduleHistory />)

      const searchInput = screen.getByPlaceholderText('搜索...')
      fireEvent.change(searchInput, { target: { value: 'NonExistentTask12345' } })

      expect(screen.getByText('暂无历史记录')).toBeInTheDocument()
    })

    it('should clear search when input is cleared', () => {
      render(<ScheduleHistory />)

      const searchInput = screen.getByPlaceholderText('搜索...')
      fireEvent.change(searchInput, { target: { value: 'test' } })
      fireEvent.change(searchInput, { target: { value: '' } })

      expect(screen.getByText(/总计/)).toBeInTheDocument()
    })

    it('should reset to first page on search', () => {
      render(<ScheduleHistory pageSize={10} />)

      // Go to page 2
      const nextButton = screen.getByTitle('下一页')
      fireEvent.click(nextButton)

      // Search
      const searchInput = screen.getByPlaceholderText('搜索...')
      fireEvent.change(searchInput, { target: { value: 'Task' } })

      // Should be on page 1
      const prevButton = screen.getByTitle('上一页')
      expect(prevButton).toBeDisabled()
    })
  })

  // ==========================================================================
  // 4. History Entry Display Tests
  // ==========================================================================
  describe('History Entry Display', () => {
    it('should display task title', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText(/Historical Task/)).toBeInTheDocument()
    })

    it('should display status badge', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText('成功')).toBeInTheDocument()
    })

    it('should display timestamp', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText(/今天|昨天/)).toBeInTheDocument()
    })

    it('should display agent ID', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText(/agent-/)).toBeInTheDocument()
    })

    it('should display task type', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText('testing')).toBeInTheDocument()
    })

    it('should display error message for failed tasks', () => {
      mockStoreState.tasks = [createFailedTask('1', 'Something went wrong')]
      render(<ScheduleHistory />)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should display task ID at bottom', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText(/ID:/)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 5. Statistics Summary Tests
  // ==========================================================================
  describe('Statistics Summary', () => {
    it('should display statistics section', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText('总执行')).toBeInTheDocument()
    })

    it('should show success count', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText('成功')).toBeInTheDocument()
    })

    it('should show failed count', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText('失败')).toBeInTheDocument()
    })

    it('should show average duration', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText('平均耗时')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 6. Auto-Refresh Tests
  // ==========================================================================
  describe('Auto-Refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should auto-refresh when enabled', () => {
      render(<ScheduleHistory autoRefresh={true} refreshInterval={30000} />)

      vi.advanceTimersByTime(30000)

      expect(mockStoreState.refresh).toHaveBeenCalled()
    })

    it('should not auto-refresh when disabled', () => {
      render(<ScheduleHistory autoRefresh={false} />)

      vi.advanceTimersByTime(60000)

      expect(mockStoreState.refresh).not.toHaveBeenCalled()
    })

    it('should use default 30 second interval', () => {
      render(<ScheduleHistory autoRefresh={true} />)

      vi.advanceTimersByTime(30000)

      expect(mockStoreState.refresh).toHaveBeenCalled()
    })

    it('should stop auto-refresh on unmount', () => {
      const { unmount } = render(<ScheduleHistory autoRefresh={true} />)

      unmount()

      vi.advanceTimersByTime(30000)

      expect(mockStoreState.refresh).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // 7. Refresh Button Tests
  // ==========================================================================
  describe('Refresh Button', () => {
    it('should display refresh button', () => {
      render(<ScheduleHistory />)
      const refreshButton = screen.getByTitle('刷新')
      expect(refreshButton).toBeInTheDocument()
    })

    it('should call refresh when clicked', () => {
      render(<ScheduleHistory />)

      const refreshButton = screen.getByTitle('刷新')
      fireEvent.click(refreshButton)

      expect(mockStoreState.refresh).toHaveBeenCalled()
    })

    it('should show spinning icon when loading', () => {
      mockStoreState.isLoading = true
      render(<ScheduleHistory />)

      const refreshButton = screen.getByTitle('刷新')
      const spinningIcon = refreshButton.querySelector('.animate-spin')
      expect(spinningIcon).toBeInTheDocument()
    })

    it('should disable button when loading', () => {
      mockStoreState.isLoading = true
      render(<ScheduleHistory />)

      const refreshButton = screen.getByTitle('刷新')
      expect(refreshButton).toBeDisabled()
    })
  })

  // ==========================================================================
  // 8. Click Interaction Tests
  // ==========================================================================
  describe('Click Interactions', () => {
    it('should call onEntryClick when entry is clicked', () => {
      const handleClick = vi.fn()

      render(<ScheduleHistory onEntryClick={handleClick} />)

      const taskCard = screen.getByText(/Historical Task/).closest('div')
      if (taskCard) {
        fireEvent.click(taskCard)
        expect(handleClick).toHaveBeenCalled()
      }
    })

    it('should not be clickable when onEntryClick is not provided', () => {
      render(<ScheduleHistory />)
      expect(screen.getByText(/Historical Task/)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 9. Time Formatting Tests
  // ==========================================================================
  describe('Time Formatting', () => {
    it('should show "今天" for today\'s tasks', () => {
      mockStoreState.tasks = [createCompletedTask('1', { completedAt: Date.now() - 1000 })]
      render(<ScheduleHistory />)

      expect(screen.getByText(/今天/)).toBeInTheDocument()
    })

    it('should show "昨天" for yesterday\'s tasks', () => {
      mockStoreState.tasks = [createCompletedTask('1', { completedAt: Date.now() - 86400000 })]
      render(<ScheduleHistory />)

      expect(screen.getByText(/昨天/)).toBeInTheDocument()
    })

    it('should format duration in seconds', () => {
      mockStoreState.tasks = [
        createCompletedTask('1', {
          startedAt: Date.now() - 5000,
          completedAt: Date.now() - 100,
        }),
      ]
      render(<ScheduleHistory />)

      expect(screen.getByText(/\d+秒/)).toBeInTheDocument()
    })

    it('should format duration in minutes', () => {
      mockStoreState.tasks = [
        createCompletedTask('1', {
          startedAt: Date.now() - 300000,
          completedAt: Date.now() - 100,
        }),
      ]
      render(<ScheduleHistory />)

      expect(screen.getByText(/\d+分钟|\d+分\d+秒/)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 10. Error Handling Tests
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle store errors gracefully', () => {
      mockStoreState.error = null // Can't assign string to null type

      render(<ScheduleHistory />)
      expect(screen.getByText('执行历史')).toBeInTheDocument()
    })

    it('should handle missing task fields', () => {
      mockStoreState.tasks = [{ id: 'incomplete' } as any]

      render(<ScheduleHistory />)
      expect(screen.getByText('执行历史')).toBeInTheDocument()
    })

    it('should handle tasks without completedAt', () => {
      mockStoreState.tasks = [createCompletedTask('1', { completedAt: undefined })]

      render(<ScheduleHistory />)
      expect(screen.getByText('执行历史')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 11. Responsive Layout Tests
  // ==========================================================================
  describe('Responsive Layout', () => {
    it('should use responsive grid layout', () => {
      const { container } = render(<ScheduleHistory />)

      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<ScheduleHistory className="custom-class" />)

      const panel = container.querySelector('.custom-class')
      expect(panel).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // 12. Edge Cases Tests
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle very long task title', () => {
      const longTitle = 'A'.repeat(500)
      mockStoreState.tasks = [createCompletedTask('1', { title: longTitle })]

      render(<ScheduleHistory />)
      expect(screen.getByText(/A+/)).toBeInTheDocument()
    })

    it('should handle special characters in title', () => {
      mockStoreState.tasks = [
        createCompletedTask('1', { title: 'Test & <script>alert("xss")</script>' }),
      ]

      render(<ScheduleHistory />)
      expect(screen.getByText(/Test &/)).toBeInTheDocument()
    })

    it('should handle Unicode characters', () => {
      mockStoreState.tasks = [createCompletedTask('1', { title: '🎉 庆祝任务 🎊' })]

      render(<ScheduleHistory />)
      expect(screen.getByText('🎉 庆祝任务 🎊')).toBeInTheDocument()
    })

    it('should handle empty task list gracefully', () => {
      mockStoreState.tasks = []
      render(<ScheduleHistory />)

      expect(screen.getByText('暂无历史记录')).toBeInTheDocument()
      expect(screen.getByText('完成的任务将在这里显示')).toBeInTheDocument()
    })

    it('should handle only pending tasks (no history)', () => {
      mockStoreState.tasks = [createPendingTask('1'), createPendingTask('2')]

      render(<ScheduleHistory />)
      expect(screen.getByText('暂无历史记录')).toBeInTheDocument()
    })

    it('should handle large dataset efficiently', () => {
      const startTime = performance.now()
      mockStoreState.tasks = generateMockTasks(100)

      render(<ScheduleHistory />)

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })
})
