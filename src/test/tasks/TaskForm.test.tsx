import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskForm from '@/app/[locale]/tasks/components/TaskForm'
import type { TaskType, TaskPriority } from '@/lib/types/task-types'
import type { MockTokenPayload } from '@/test/types'

// Mock AssignmentSuggester
vi.mock('./AssignmentSuggester', () => ({
  default: vi.fn(({ onAssigneeChange }) => (
    <div data-testid="assignment-suggester">
      <button 
        onClick={() => onAssigneeChange?.('executor')}
        data-testid="assign-btn"
      >
        Assign to Executor
      </button>
      <button 
        onClick={() => onAssigneeChange?.(null)}
        data-testid="unassign-btn"
      >
        Unassign
      </button>
    </div>
  )),
}))

// Mock stores
vi.mock('@/lib/store/tasks-store', () => ({
  useTasksStore: vi.fn((selector) => {
    const state = {
      addTask: vi.fn(),
      updateTask: vi.fn(),
    }
    return selector(state)
  }),
}))

vi.mock('@/stores/dashboardStore', () => ({
  useMembers: vi.fn(() => [
    { id: 'executor', name: 'Executor', role: 'development' },
    { id: 'designer', name: 'Designer', role: 'design' },
  ]),
}))

describe('TaskForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render all form fields', () => {
      render(<TaskForm />)
      
      expect(screen.getByLabelText(/任务标题/)).toBeInTheDocument()
      expect(screen.getByLabelText(/任务描述/)).toBeInTheDocument()
      expect(screen.getByLabelText(/任务类型/)).toBeInTheDocument()
      expect(screen.getByLabelText(/优先级/)).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<TaskForm />)
      expect(screen.getByRole('button', { name: /创建任务/ })).toBeInTheDocument()
    })

    it('should render update button when taskId is provided', () => {
      render(<TaskForm taskId="task_123" />)
      expect(screen.getByRole('button', { name: /更新任务/ })).toBeInTheDocument()
    })

    it('should render assignment suggester when showAssignment is true and members exist', () => {
      render(<TaskForm showAssignment={true} />)
      expect(screen.getByTestId('assignment-suggester')).toBeInTheDocument()
    })

    it('should not render assignment suggester when showAssignment is false', () => {
      render(<TaskForm showAssignment={false} />)
      expect(screen.queryByTestId('assignment-suggester')).not.toBeInTheDocument()
    })
  })

  describe('initial data', () => {
    it('should populate form with initial data', () => {
      const initialData = {
        title: 'Initial Title',
        description: 'Initial description',
        type: 'design' as TaskType,
        priority: 'high' as TaskPriority,
      }
      
      render(<TaskForm initialData={initialData} />)
      
      expect(screen.getByDisplayValue('Initial Title')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Initial description')).toBeInTheDocument()
      // Check select values by their value attribute, not display text
      expect(screen.getByLabelText(/任务类型/)).toHaveValue('design')
      expect(screen.getByLabelText(/优先级/)).toHaveValue('high')
    })

    it('should use default values when no initial data', () => {
      render(<TaskForm />)
      
      expect(screen.getByDisplayValue('development')).toBeInTheDocument()
      expect(screen.getByDisplayValue('medium')).toBeInTheDocument()
    })
  })

  describe('input handling', () => {
    it('should update title on input', async () => {
      render(<TaskForm />)
      
      const titleInput = screen.getByLabelText(/任务标题/)
      await user.type(titleInput, 'New Task Title')
      
      expect(titleInput).toHaveValue('New Task Title')
    })

    it('should update description on input', async () => {
      render(<TaskForm />)
      
      const descInput = screen.getByLabelText(/任务描述/)
      await user.type(descInput, 'Task description here')
      
      expect(descInput).toHaveValue('Task description here')
    })

    it('should update type on select change', async () => {
      render(<TaskForm />)
      
      const typeSelect = screen.getByLabelText(/任务类型/)
      await user.selectOptions(typeSelect, 'design')
      
      expect(typeSelect).toHaveValue('design')
    })

    it('should update priority on select change', async () => {
      render(<TaskForm />)
      
      const prioritySelect = screen.getByLabelText(/优先级/)
      await user.selectOptions(prioritySelect, 'urgent')
      
      expect(prioritySelect).toHaveValue('urgent')
    })
  })

  describe('task type options', () => {
    it('should render all task type options', () => {
      render(<TaskForm />)
      
      const typeSelect = screen.getByLabelText(/任务类型/)
      expect(typeSelect.querySelector('option[value="development"]')).toBeInTheDocument()
      expect(typeSelect.querySelector('option[value="design"]')).toBeInTheDocument()
      expect(typeSelect.querySelector('option[value="research"]')).toBeInTheDocument()
      expect(typeSelect.querySelector('option[value="marketing"]')).toBeInTheDocument()
      expect(typeSelect.querySelector('option[value="other"]')).toBeInTheDocument()
    })
  })

  describe('priority options', () => {
    it('should render all priority options', () => {
      render(<TaskForm />)
      
      const prioritySelect = screen.getByLabelText(/优先级/)
      expect(prioritySelect.querySelector('option[value="low"]')).toBeInTheDocument()
      expect(prioritySelect.querySelector('option[value="medium"]')).toBeInTheDocument()
      expect(prioritySelect.querySelector('option[value="high"]')).toBeInTheDocument()
      expect(prioritySelect.querySelector('option[value="urgent"]')).toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('should call onSubmit with form data', async () => {
      const mockOnSubmit = vi.fn()
      render(<TaskForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText(/任务标题/), 'Test Task')
      await user.type(screen.getByLabelText(/任务描述/), 'Test Description')
      await user.selectOptions(screen.getByLabelText(/任务类型/), 'research')
      await user.selectOptions(screen.getByLabelText(/优先级/), 'high')
      
      await user.click(screen.getByRole('button', { name: /创建任务/ }))
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Test Task',
        description: 'Test Description',
        type: 'research',
        priority: 'high',
        assignee: undefined,
      })
    })

    it('should call onSubmit with assignee when assigned', async () => {
      const mockOnSubmit = vi.fn()
      render(<TaskForm onSubmit={mockOnSubmit} showAssignment={true} />)
      
      await user.type(screen.getByLabelText(/任务标题/), 'Test Task')
      await user.click(screen.getByTestId('assign-btn'))
      await user.click(screen.getByRole('button', { name: /创建任务/ }))
      
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: 'executor',
        })
      )
    })

    it('should not submit form when title is empty', async () => {
      const mockOnSubmit = vi.fn()
      render(<TaskForm onSubmit={mockOnSubmit} />)
      
      // Title is required, try to submit without filling it
      const submitButton = screen.getByRole('button', { name: /创建任务/ })
      
      // The form has required attribute, so we need to check HTML5 validation
      // In testing-library, the form won't actually submit if required fields are empty
      const form = submitButton.closest('form')!
      expect(form.checkValidity()).toBe(false)
    })

    it('should submit form with all fields', async () => {
      const mockOnSubmit = vi.fn()
      render(<TaskForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText(/任务标题/), 'Complete Task')
      await user.type(screen.getByLabelText(/任务描述/), 'Full description')
      await user.selectOptions(screen.getByLabelText(/任务类型/), 'marketing')
      await user.selectOptions(screen.getByLabelText(/优先级/), 'urgent')
      
      await user.click(screen.getByRole('button', { name: /创建任务/ }))
      
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('assignment functionality', () => {
    it('should track assignee changes', async () => {
      const mockOnSubmit = vi.fn()
      render(<TaskForm onSubmit={mockOnSubmit} showAssignment={true} />)
      
      await user.type(screen.getByLabelText(/任务标题/), 'Task')
      await user.click(screen.getByTestId('assign-btn'))
      await user.click(screen.getByTestId('unassign-btn'))
      await user.click(screen.getByRole('button', { name: /创建任务/ }))
      
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: undefined,
        })
      )
    })
  })

  describe('with taskId (update mode)', () => {
    it('should call updateTask when taskId provided and no onSubmit', async () => {
      const { useTasksStore } = await import('@/lib/store/tasks-store')
      const mockUpdateTask = vi.fn()
      vi.mocked(useTasksStore).mockImplementation((selector: (state: { addTask: ReturnType<typeof vi.fn>; updateTask: typeof mockUpdateTask }) => unknown) => 
        selector({ addTask: vi.fn(), updateTask: mockUpdateTask })
      )
      
      render(<TaskForm taskId="task_123" />)
      
      await user.type(screen.getByLabelText(/任务标题/), 'Updated Task')
      await user.click(screen.getByRole('button', { name: /更新任务/ }))
      
      expect(mockUpdateTask).toHaveBeenCalledWith('task_123', expect.objectContaining({
        title: 'Updated Task',
      }))
    })
  })

  describe('create mode without onSubmit', () => {
    it('should call addTask when no onSubmit provided', async () => {
      const { useTasksStore } = await import('@/lib/store/tasks-store')
      const mockAddTask = vi.fn()
      vi.mocked(useTasksStore).mockImplementation((selector: any) => 
        selector({ addTask: mockAddTask, updateTask: vi.fn() })
      )
      
      render(<TaskForm />)
      
      await user.type(screen.getByLabelText(/任务标题/), 'New Task')
      await user.click(screen.getByRole('button', { name: /创建任务/ }))
      
      expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Task',
      }))
    })
  })

  describe('validation', () => {
    it('should have required attribute on title input', () => {
      render(<TaskForm />)
      
      const titleInput = screen.getByLabelText(/任务标题/)
      expect(titleInput).toBeRequired()
    })

    it('description should not be required', () => {
      render(<TaskForm />)
      
      const descInput = screen.getByLabelText(/任务描述/)
      expect(descInput).not.toBeRequired()
    })
  })

  describe('accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<TaskForm />)
      
      expect(screen.getByLabelText(/任务标题/)).toBeInTheDocument()
      expect(screen.getByLabelText(/任务描述/)).toBeInTheDocument()
      expect(screen.getByLabelText(/任务类型/)).toBeInTheDocument()
      expect(screen.getByLabelText(/优先级/)).toBeInTheDocument()
    })

    it('should have proper input types', () => {
      render(<TaskForm />)
      
      expect(screen.getByLabelText(/任务标题/)).toHaveAttribute('type', 'text')
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in title', async () => {
      const mockOnSubmit = vi.fn()
      render(<TaskForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText(/任务标题/), 'Test <script>alert("xss")</script>')
      await user.click(screen.getByRole('button', { name: /创建任务/ }))
      
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test <script>alert("xss")</script>',
        })
      )
    })

    it('should handle unicode characters', async () => {
      const mockOnSubmit = vi.fn()
      render(<TaskForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText(/任务标题/), '任务 🎉 Test')
      await user.click(screen.getByRole('button', { name: /创建任务/ }))
      
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '任务 🎉 Test',
        })
      )
    })

    it('should handle long descriptions', async () => {
      const mockOnSubmit = vi.fn()
      const longText = 'A'.repeat(1000)
      
      render(<TaskForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText(/任务标题/), 'Task')
      await user.type(screen.getByLabelText(/任务描述/), longText)
      await user.click(screen.getByRole('button', { name: /创建任务/ }))
      
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: longText,
        })
      )
    })

    it('should handle whitespace-only title', async () => {
      const mockOnSubmit = vi.fn()
      render(<TaskForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText(/任务标题/), '   ')
      await user.click(screen.getByRole('button', { name: /创建任务/ }))
      
      // The form should still submit (HTML5 validation passes for whitespace)
      expect(mockOnSubmit).toHaveBeenCalled()
    })
  })

  describe('form reset behavior', () => {
    it('should maintain form state during typing', async () => {
      render(<TaskForm />)
      
      await user.type(screen.getByLabelText(/任务标题/), 'Test')
      await user.selectOptions(screen.getByLabelText(/任务类型/), 'design')
      await user.type(screen.getByLabelText(/任务描述/), 'Description')
      
      expect(screen.getByLabelText(/任务标题/)).toHaveValue('Test')
      expect(screen.getByLabelText(/任务类型/)).toHaveValue('design')
      expect(screen.getByLabelText(/任务描述/)).toHaveValue('Description')
    })
  })
})