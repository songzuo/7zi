/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TasksPage from '@/app/[locale]/tasks/page'

// Mock stores
vi.mock('@/lib/store/tasks-store', () => ({
  useTasksStore: vi.fn((selector) => {
    const state = {
      tasks: [] as any[],
      addTask: vi.fn((taskData) => {
        state.tasks.push({
          id: `task_${Date.now()}`,
          ...taskData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: [],
          history: [{ status: 'pending', timestamp: new Date().toISOString(), changedBy: taskData.createdBy }],
        })
      }),
      updateTask: vi.fn(),
    }
    return selector(state)
  }),
}))

vi.mock('@/stores/dashboardStore', () => ({
  useMembers: vi.fn(() => [
    { id: 'executor', name: 'Executor', role: 'development', status: 'idle' },
    { id: 'architect', name: 'Architect', role: 'development', status: 'idle' },
    { id: 'designer', name: 'Designer', role: 'design', status: 'busy' },
  ]),
}))

// Mock child components
vi.mock('@/app/tasks/components/TaskCard', () => ({
  default: vi.fn(({ task, onEdit, onAssign, onSelect }) => (
    <div data-testid={`task-card-${task.id}`}>
      <span>{task.title}</span>
      <button onClick={() => onEdit?.({ title: 'Updated' })} data-testid={`edit-${task.id}`}>
        Edit
      </button>
      <button onClick={() => onAssign?.(task.id, 'executor')} data-testid={`assign-${task.id}`}>
        Assign
      </button>
      <button onClick={() => onSelect?.()} data-testid={`select-${task.id}`}>
        Select
      </button>
    </div>
  )),
}))

vi.mock('@/app/tasks/components/TaskForm', () => ({
  default: vi.fn(({ onSubmit, onCancel }) => (
    <div data-testid="task-form">
      <button 
        onClick={() => onSubmit?.({ title: 'New Task', description: '', type: 'development', priority: 'medium' })}
        data-testid="submit-form"
      >
        Submit Form
      </button>
      <button onClick={onCancel} data-testid="cancel-form">
        Cancel
      </button>
    </div>
  )),
}))

vi.mock('@/app/tasks/components/AssignmentSuggester', () => ({
  default: vi.fn(({ task, onAssign, onUnassign }) => (
    <div data-testid="assignment-suggester">
      <button onClick={() => onAssign?.(task.id, 'executor')} data-testid="suggest-assign">
        Assign
      </button>
      <button onClick={() => onUnassign?.(task.id)} data-testid="suggest-unassign">
        Unassign
      </button>
    </div>
  )),
}))

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: vi.fn(() => <div data-testid="loading-spinner">Loading...</div>),
}))

describe('TasksPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render page title', () => {
      render(<TasksPage />)
      expect(screen.getByText('AI 任务管理')).toBeInTheDocument()
    })

    it('should render create task button', () => {
      render(<TasksPage />)
      expect(screen.getByText('创建新任务')).toBeInTheDocument()
    })

    it('should show empty state when no tasks', () => {
      render(<TasksPage />)
      expect(screen.getByText('暂无任务。创建您的第一个任务开始吧！')).toBeInTheDocument()
      expect(screen.getByText('创建第一个任务')).toBeInTheDocument()
    })

    it('should not show empty state when there are tasks', async () => {
      const { useTasksStore } = await import('@/lib/store/tasks-store')
      vi.mocked(useTasksStore).mockImplementation((selector: any) => {
        const state = {
          tasks: [{
            id: 'task_1',
            title: 'Existing Task',
            description: '',
            type: 'development',
            priority: 'medium',
            status: 'pending',
            createdBy: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            history: [],
          }],
          addTask: vi.fn(),
          updateTask: vi.fn(),
        }
        return selector(state)
      })

      render(<TasksPage />)
      
      expect(screen.queryByText('暂无任务')).not.toBeInTheDocument()
    })
  })

  describe('create task form', () => {
    it('should show create form when clicking create button', async () => {
      render(<TasksPage />)
      
      await user.click(screen.getByText('创建新任务'))
      
      expect(screen.getByTestId('task-form')).toBeInTheDocument()
      expect(screen.getByText('创建新任务')).toBeInTheDocument()
    })

    it('should show create form when clicking empty state button', async () => {
      render(<TasksPage />)
      
      await user.click(screen.getByText('创建第一个任务'))
      
      expect(screen.getByTestId('task-form')).toBeInTheDocument()
    })

    it('should hide create form when clicking cancel', async () => {
      render(<TasksPage />)
      
      await user.click(screen.getByText('创建新任务'))
      expect(screen.getByTestId('task-form')).toBeInTheDocument()
      
      await user.click(screen.getByTestId('cancel-form'))
      expect(screen.queryByTestId('task-form')).not.toBeInTheDocument()
    })

    it('should hide create form after successful submission', async () => {
      render(<TasksPage />)
      
      await user.click(screen.getByText('创建新任务'))
      expect(screen.getByTestId('task-form')).toBeInTheDocument()
      
      await user.click(screen.getByTestId('submit-form'))
      expect(screen.queryByTestId('task-form')).not.toBeInTheDocument()
    })
  })

  describe('task list', () => {
    beforeEach(async () => {
      const { useTasksStore } = await import('@/lib/store/tasks-store')
      vi.mocked(useTasksStore).mockImplementation((selector: any) => {
        const state = {
          tasks: [
            {
              id: 'task_1',
              title: 'First Task',
              description: 'Description 1',
              type: 'development',
              priority: 'high',
              status: 'pending',
              createdBy: 'user',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              comments: [],
              history: [],
            },
            {
              id: 'task_2',
              title: 'Second Task',
              description: 'Description 2',
              type: 'design',
              priority: 'medium',
              status: 'assigned',
              assignee: 'designer',
              createdBy: 'ai',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              comments: [],
              history: [],
            },
          ],
          addTask: vi.fn(),
          updateTask: vi.fn(),
        }
        return selector(state)
      })
    })

    it('should render all tasks', () => {
      render(<TasksPage />)
      
      expect(screen.getByTestId('task-card-task_1')).toBeInTheDocument()
      expect(screen.getByTestId('task-card-task_2')).toBeInTheDocument()
    })

    it('should display task titles', () => {
      render(<TasksPage />)
      
      expect(screen.getByText('First Task')).toBeInTheDocument()
      expect(screen.getByText('Second Task')).toBeInTheDocument()
    })
  })

  describe('task operations', () => {
    let mockAddTask: ReturnType<typeof vi.fn>
    let mockUpdateTask: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      mockAddTask = vi.fn()
      mockUpdateTask = vi.fn()
      
      const { useTasksStore } = await import('@/lib/store/tasks-store')
      vi.mocked(useTasksStore).mockImplementation((selector: any) => {
        const state = {
          tasks: [{
            id: 'task_1',
            title: 'Test Task',
            description: 'Test',
            type: 'development',
            priority: 'medium',
            status: 'pending',
            createdBy: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            history: [],
          }],
          addTask: mockAddTask,
          updateTask: mockUpdateTask,
        }
        return selector(state)
      })
    })

    it('should call addTask when creating a new task', async () => {
      render(<TasksPage />)
      
      await user.click(screen.getByText('创建新任务'))
      await user.click(screen.getByTestId('submit-form'))
      
      expect(mockAddTask).toHaveBeenCalled()
    })

    it('should call updateTask when editing a task', async () => {
      render(<TasksPage />)
      
      await user.click(screen.getByTestId('edit-task_1'))
      
      expect(mockUpdateTask).toHaveBeenCalledWith('task_1', { title: 'Updated' })
    })
  })

  describe('task assignment', () => {
    let mockUpdateTask: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      mockUpdateTask = vi.fn()
      
      const { useTasksStore } = await import('@/lib/store/tasks-store')
      vi.mocked(useTasksStore).mockImplementation((selector: any) => {
        const state = {
          tasks: [{
            id: 'task_1',
            title: 'Test Task',
            description: 'Test',
            type: 'development',
            priority: 'medium',
            status: 'pending',
            createdBy: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            history: [],
          }],
          addTask: vi.fn(),
          updateTask: mockUpdateTask,
        }
        return selector(state)
      })
    })

    it('should update task status to assigned when assigning', async () => {
      render(<TasksPage />)
      
      await user.click(screen.getByTestId('assign-task_1'))
      
      expect(mockUpdateTask).toHaveBeenCalledWith('task_1', {
        assignee: 'executor',
        status: 'assigned',
      })
    })
  })

  describe('task selection', () => {
    beforeEach(async () => {
      const { useTasksStore } = await import('@/lib/store/tasks-store')
      vi.mocked(useTasksStore).mockImplementation((selector: any) => {
        const state = {
          tasks: [{
            id: 'task_1',
            title: 'Test Task',
            description: 'Test',
            type: 'development',
            priority: 'medium',
            status: 'pending',
            createdBy: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            history: [],
          }],
          addTask: vi.fn(),
          updateTask: vi.fn(),
        }
        return selector(state)
      })
    })

    it('should show assignment suggester when task is selected', async () => {
      render(<TasksPage />)
      
      await user.click(screen.getByTestId('select-task_1'))
      
      expect(screen.getByTestId('assignment-suggester')).toBeInTheDocument()
    })

    it('should hide assignment suggester when task is deselected', async () => {
      render(<TasksPage />)
      
      // Select task
      await user.click(screen.getByTestId('select-task_1'))
      expect(screen.getByTestId('assignment-suggester')).toBeInTheDocument()
      
      // Deselect task
      await user.click(screen.getByTestId('select-task_1'))
      expect(screen.queryByTestId('assignment-suggester')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should not show loading spinner by default', () => {
      render(<TasksPage />)
      
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<TasksPage />)
      
      expect(screen.getByRole('heading', { name: /AI 任务管理/, level: 1 })).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      render(<TasksPage />)
      
      expect(screen.getByRole('button', { name: /创建新任务/ })).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle multiple rapid task selections', async () => {
      const { useTasksStore } = await import('@/lib/store/tasks-store')
      vi.mocked(useTasksStore).mockImplementation((selector: any) => {
        const state = {
          tasks: [
            { id: 'task_1', title: 'Task 1', description: '', type: 'development', priority: 'medium', status: 'pending', createdBy: 'user', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), comments: [], history: [] },
            { id: 'task_2', title: 'Task 2', description: '', type: 'development', priority: 'medium', status: 'pending', createdBy: 'user', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), comments: [], history: [] },
          ],
          addTask: vi.fn(),
          updateTask: vi.fn(),
        }
        return selector(state)
      })

      render(<TasksPage />)
      
      // Rapid selections
      await user.click(screen.getByTestId('select-task_1'))
      await user.click(screen.getByTestId('select-task_2'))
      
      // Should handle gracefully
      expect(screen.getByTestId('assignment-suggester')).toBeInTheDocument()
    })

    it('should handle create form toggle while task is selected', async () => {
      const { useTasksStore } = await import('@/lib/store/tasks-store')
      vi.mocked(useTasksStore).mockImplementation((selector: any) => {
        const state = {
          tasks: [{
            id: 'task_1',
            title: 'Test Task',
            description: '',
            type: 'development',
            priority: 'medium',
            status: 'pending',
            createdBy: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: [],
            history: [],
          }],
          addTask: vi.fn(),
          updateTask: vi.fn(),
        }
        return selector(state)
      })

      render(<TasksPage />)
      
      // Select a task
      await user.click(screen.getByTestId('select-task_1'))
      
      // Open create form
      await user.click(screen.getByText('创建新任务'))
      
      // Both form and suggester should be visible
      expect(screen.getByTestId('task-form')).toBeInTheDocument()
      expect(screen.getByTestId('assignment-suggester')).toBeInTheDocument()
    })
  })
})
