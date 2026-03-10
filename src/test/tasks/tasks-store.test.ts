import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { useTasksStore } from '@/lib/store/tasks-store'
import type { Task } from '@/lib/types/task-types'

// Mock dashboard store
vi.mock('@/stores/dashboardStore', () => ({
  useDashboardStore: {
    getState: () => ({
      updateMemberStatus: vi.fn(),
      updateMemberTask: vi.fn(),
      members: [
        { id: 'executor', name: 'Executor', status: 'idle' },
        { id: 'architect', name: 'Architect', status: 'idle' },
      ],
    }),
  },
}))

describe('TasksStore', () => {
  beforeEach(() => {
    // Clear persisted storage and reset store before each test
    localStorage.removeItem('tasks-storage')
    act(() => {
      useTasksStore.setState({ tasks: [] })
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have empty tasks array initially', () => {
      const { tasks } = useTasksStore.getState()
      expect(tasks).toEqual([])
    })
  })

  describe('addTask', () => {
    it('should add a new task with generated id and timestamps', () => {
      const beforeAdd = Date.now()
      
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Test Task',
          description: 'Test description',
          type: 'development',
          priority: 'medium',
          status: 'pending',
          createdBy: 'user',
        })
      })
      
      const afterAdd = Date.now()
      const { tasks } = useTasksStore.getState()
      
      expect(tasks).toHaveLength(1)
      expect(tasks[0].title).toBe('Test Task')
      expect(tasks[0].description).toBe('Test description')
      expect(tasks[0].type).toBe('development')
      expect(tasks[0].priority).toBe('medium')
      expect(tasks[0].status).toBe('pending')
      expect(tasks[0].createdBy).toBe('user')
      expect(tasks[0].id).toMatch(/^task_\d+_[a-z0-9]+$/)
      
      const createdAt = new Date(tasks[0].createdAt).getTime()
      expect(createdAt).toBeGreaterThanOrEqual(beforeAdd)
      expect(createdAt).toBeLessThanOrEqual(afterAdd)
    })

    it('should initialize comments and history arrays', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Test Task',
          description: 'Test',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'ai',
        })
      })
      
      const { tasks } = useTasksStore.getState()
      
      expect(tasks[0].comments).toEqual([])
      expect(tasks[0].history).toHaveLength(1)
      expect(tasks[0].history[0].status).toBe('pending')
    })

    it('should add task with assignee when provided', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Assigned Task',
          description: 'Test',
          type: 'design',
          priority: 'high',
          status: 'assigned',
          assignee: 'executor',
          createdBy: 'user',
        })
      })
      
      const { tasks } = useTasksStore.getState()
      
      expect(tasks[0].assignee).toBe('executor')
      expect(tasks[0].status).toBe('assigned')
    })

    it('should add multiple tasks', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Task 1',
          description: 'First',
          type: 'development',
          priority: 'low',
          status: 'pending',
          createdBy: 'user',
        })
        useTasksStore.getState().addTask({
          title: 'Task 2',
          description: 'Second',
          type: 'design',
          priority: 'high',
          status: 'pending',
          createdBy: 'ai',
        })
      })
      
      const { tasks } = useTasksStore.getState()
      
      expect(tasks).toHaveLength(2)
      expect(tasks[0].title).toBe('Task 1')
      expect(tasks[1].title).toBe('Task 2')
    })

    it('should support all task types', () => {
      const types = ['development', 'design', 'research', 'marketing', 'other'] as const
      
      types.forEach((type, index) => {
        act(() => {
          useTasksStore.getState().addTask({
            title: `Task ${index}`,
            description: 'Test',
            type,
            priority: 'medium',
            status: 'pending',
            createdBy: 'user',
          })
        })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks).toHaveLength(5)
      types.forEach((type, index) => {
        expect(tasks[index].type).toBe(type)
      })
    })

    it('should support all priority levels', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'] as const
      
      priorities.forEach((priority, index) => {
        act(() => {
          useTasksStore.getState().addTask({
            title: `Task ${index}`,
            description: 'Test',
            type: 'development',
            priority,
            status: 'pending',
            createdBy: 'user',
          })
        })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks).toHaveLength(4)
      priorities.forEach((priority, index) => {
        expect(tasks[index].priority).toBe(priority)
      })
    })
  })

  describe('updateTask', () => {
    let testTask: Task

    beforeEach(() => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Original Title',
          description: 'Original description',
          type: 'development',
          priority: 'medium',
          status: 'pending',
          createdBy: 'user',
        })
      })
      testTask = useTasksStore.getState().tasks[0]
    })

    it('should update task title', () => {
      act(() => {
        useTasksStore.getState().updateTask(testTask.id, { title: 'Updated Title' })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].title).toBe('Updated Title')
      expect(tasks[0].description).toBe('Original description')
    })

    it('should update task status', () => {
      act(() => {
        useTasksStore.getState().updateTask(testTask.id, { status: 'in_progress' })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].status).toBe('in_progress')
    })

    it('should update task priority', () => {
      act(() => {
        useTasksStore.getState().updateTask(testTask.id, { priority: 'urgent' })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].priority).toBe('urgent')
    })

    it('should update task assignee', () => {
      act(() => {
        useTasksStore.getState().updateTask(testTask.id, { assignee: 'architect' })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].assignee).toBe('architect')
    })

    it('should update updatedAt timestamp', async () => {
      const originalUpdatedAt = testTask.updatedAt
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))
      
      act(() => {
        useTasksStore.getState().updateTask(testTask.id, { title: 'New Title' })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(new Date(tasks[0].updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      )
    })

    it('should not affect other tasks', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Second Task',
          description: 'Should not change',
          type: 'design',
          priority: 'low',
          status: 'pending',
          createdBy: 'user',
        })
      })
      
      // secondTaskId used for verification that second task is not affected
      // const secondTaskId = useTasksStore.getState().tasks[1].id
      
      act(() => {
        useTasksStore.getState().updateTask(testTask.id, { title: 'Updated' })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].title).toBe('Updated')
      expect(tasks[1].title).toBe('Second Task')
    })

    it('should handle non-existent task id gracefully', () => {
      const originalTasks = [...useTasksStore.getState().tasks]
      
      act(() => {
        useTasksStore.getState().updateTask('non-existent-id', { title: 'Updated' })
      })
      
      // Tasks should remain unchanged
      expect(useTasksStore.getState().tasks).toEqual(originalTasks)
    })

    it('should support updating multiple fields at once', () => {
      act(() => {
        useTasksStore.getState().updateTask(testTask.id, {
          title: 'New Title',
          description: 'New Description',
          priority: 'high',
          status: 'in_progress',
          assignee: 'executor',
        })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].title).toBe('New Title')
      expect(tasks[0].description).toBe('New Description')
      expect(tasks[0].priority).toBe('high')
      expect(tasks[0].status).toBe('in_progress')
      expect(tasks[0].assignee).toBe('executor')
    })
  })

  describe('deleteTask', () => {
    let testTask: Task

    beforeEach(() => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Task to Delete',
          description: 'Test',
          type: 'development',
          priority: 'medium',
          status: 'pending',
          createdBy: 'user',
        })
      })
      testTask = useTasksStore.getState().tasks[0]
    })

    it('should delete a task by id', () => {
      expect(useTasksStore.getState().tasks).toHaveLength(1)
      
      act(() => {
        useTasksStore.getState().deleteTask(testTask.id)
      })
      
      expect(useTasksStore.getState().tasks).toHaveLength(0)
    })

    it('should only delete the specified task', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Task 2',
          description: 'Test',
          type: 'design',
          priority: 'low',
          status: 'pending',
          createdBy: 'user',
        })
      })
      
      const task2Id = useTasksStore.getState().tasks[1].id
      
      act(() => {
        useTasksStore.getState().deleteTask(testTask.id)
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks).toHaveLength(1)
      expect(tasks[0].id).toBe(task2Id)
    })

    it('should handle non-existent task id gracefully', () => {
      act(() => {
        useTasksStore.getState().deleteTask('non-existent-id')
      })
      
      expect(useTasksStore.getState().tasks).toHaveLength(1)
    })
  })

  describe('assignTask', () => {
    let testTask: Task

    beforeEach(() => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Task to Assign',
          description: 'Test',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user',
        })
      })
      testTask = useTasksStore.getState().tasks[0]
    })

    it('should assign task to a member', () => {
      act(() => {
        useTasksStore.getState().assignTask(testTask.id, 'executor')
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].assignee).toBe('executor')
      expect(tasks[0].status).toBe('assigned')
    })

    it('should add history entry for assignment', () => {
      act(() => {
        useTasksStore.getState().assignTask(testTask.id, 'architect')
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].history).toHaveLength(2)
      expect(tasks[0].history[1].status).toBe('assigned')
    })

    it('should update member status in dashboard store', async () => {
      const { useDashboardStore } = await import('@/stores/dashboardStore')
      const mockUpdateMemberStatus = vi.fn()
      const mockUpdateMemberTask = vi.fn()
      
      // Override the getState for this test
      const originalGetState = useDashboardStore.getState
      useDashboardStore.getState = () => ({
        updateMemberStatus: mockUpdateMemberStatus,
        updateMemberTask: mockUpdateMemberTask,
        members: [],
      } as any)
      
      act(() => {
        useTasksStore.getState().assignTask(testTask.id, 'executor')
      })
      
      expect(mockUpdateMemberStatus).toHaveBeenCalledWith('executor', 'working')
      
      // Restore original
      useDashboardStore.getState = originalGetState
    })
  })

  describe('completeTask', () => {
    let testTask: Task

    beforeEach(() => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Task to Complete',
          description: 'Test',
          type: 'development',
          priority: 'medium',
          status: 'in_progress',
          assignee: 'executor',
          createdBy: 'user',
        })
      })
      testTask = useTasksStore.getState().tasks[0]
    })

    it('should mark task as completed', () => {
      act(() => {
        useTasksStore.getState().completeTask(testTask.id)
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].status).toBe('completed')
    })

    it('should add history entry for completion', () => {
      act(() => {
        useTasksStore.getState().completeTask(testTask.id)
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].history).toHaveLength(2)
      expect(tasks[0].history[1].status).toBe('completed')
    })

    it('should handle non-existent task gracefully', () => {
      act(() => {
        useTasksStore.getState().completeTask('non-existent-id')
      })
      
      // Should not throw and tasks should remain unchanged
      expect(useTasksStore.getState().tasks).toHaveLength(1)
    })
  })

  describe('addComment', () => {
    let testTask: Task

    beforeEach(() => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Task for Comments',
          description: 'Test',
          type: 'development',
          priority: 'medium',
          status: 'pending',
          createdBy: 'user',
        })
      })
      testTask = useTasksStore.getState().tasks[0]
    })

    it('should add a comment to a task', () => {
      act(() => {
        useTasksStore.getState().addComment(testTask.id, {
          author: 'user',
          content: 'This is a test comment',
        })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].comments).toHaveLength(1)
      expect(tasks[0].comments[0].author).toBe('user')
      expect(tasks[0].comments[0].content).toBe('This is a test comment')
    })

    it('should generate unique comment id', () => {
      const beforeAdd = Date.now()
      
      act(() => {
        useTasksStore.getState().addComment(testTask.id, {
          author: 'user',
          content: 'Comment',
        })
      })
      
      const afterAdd = Date.now()
      const { tasks } = useTasksStore.getState()
      
      // Comment ID format: comment_timestamp_randomString
      expect(tasks[0].comments[0].id).toMatch(/^comment_\d+_[a-z0-9]+$/)
      const parts = tasks[0].comments[0].id.split('_')
      const commentTimestamp = parseInt(parts[1])
      expect(commentTimestamp).toBeGreaterThanOrEqual(beforeAdd)
      expect(commentTimestamp).toBeLessThanOrEqual(afterAdd)
    })

    it('should add timestamp to comment', () => {
      const beforeAdd = Date.now()
      
      act(() => {
        useTasksStore.getState().addComment(testTask.id, {
          author: 'user',
          content: 'Comment',
        })
      })
      
      const afterAdd = Date.now()
      const { tasks } = useTasksStore.getState()
      
      const timestamp = new Date(tasks[0].comments[0].timestamp).getTime()
      expect(timestamp).toBeGreaterThanOrEqual(beforeAdd)
      expect(timestamp).toBeLessThanOrEqual(afterAdd)
    })

    it('should add multiple comments', () => {
      act(() => {
        useTasksStore.getState().addComment(testTask.id, {
          author: 'user1',
          content: 'First comment',
        })
        useTasksStore.getState().addComment(testTask.id, {
          author: 'user2',
          content: 'Second comment',
        })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].comments).toHaveLength(2)
      expect(tasks[0].comments[0].content).toBe('First comment')
      expect(tasks[0].comments[1].content).toBe('Second comment')
    })

    it('should update task updatedAt timestamp', async () => {
      const originalUpdatedAt = testTask.updatedAt
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      act(() => {
        useTasksStore.getState().addComment(testTask.id, {
          author: 'user',
          content: 'Comment',
        })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(new Date(tasks[0].updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      )
    })

    it('should not affect other tasks', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Second Task',
          description: 'Test',
          type: 'design',
          priority: 'low',
          status: 'pending',
          createdBy: 'user',
        })
      })
      
      // secondTaskId used for verification that second task is not affected
      // const secondTaskId = useTasksStore.getState().tasks[1].id
      
      act(() => {
        useTasksStore.getState().addComment(testTask.id, {
          author: 'user',
          content: 'Comment',
        })
      })
      
      const { tasks } = useTasksStore.getState()
      expect(tasks[0].comments).toHaveLength(1)
      expect(tasks[1].comments).toHaveLength(0)
    })
  })
})
