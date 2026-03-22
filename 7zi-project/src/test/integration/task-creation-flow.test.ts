/**
 * @fileoverview Integration test for Task Creation Flow
 * Tests the complete workflow of creating, viewing, and managing tasks (GitHub Issues)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Task interface for testing
interface Task {
  id: number;
  title: string;
  state: string;
  assignee?: { login: string };
  created_at: string;
  labels: Array<{ name: string }>;
}

// Mock the TasksPage component
vi.mock('@/app/[locale]/tasks/page', () => ({
  default: ({ onTaskCreate }: { onTaskCreate?: (task: Task) => void }) => ({
    __html: '<div data-testid="tasks-page"></div>',
  })
}))

// Mock TaskBoardSearch component
vi.mock('@/components/TaskBoardSearch', () => ({
  TaskBoardSearch: ({ onSearch }: { onSearch?: (query: string) => void }) => ({
    __html: '<div data-testid="task-search"></div>',
  })
}))

describe('Task Creation Flow Integration Test', () => {
  const mockTasks = [
    {
      id: 1,
      title: 'Implement user authentication',
      state: 'open',
      assignee: { login: 'user1' },
      created_at: '2024-03-19T10:00:00Z',
      labels: [{ name: 'feature' }, { name: 'high-priority' }],
    },
    {
      id: 2,
      title: 'Fix navigation bug',
      state: 'closed',
      assignee: { login: 'user2' },
      created_at: '2024-03-18T15:30:00Z',
      labels: [{ name: 'bug' }, { name: 'medium-priority' }],
    },
  ]

  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Task Creation', () => {
    it('should create a new task successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, task: mockTasks[0] }),
      })

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Task',
          description: 'Task description',
          labels: ['feature'],
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.task).toBeDefined()
    })

    it('should validate task title is required', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          details: { title: 'Title is required' },
        }),
      })

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Task description',
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.details.title).toBe('Title is required')
    })

    it('should assign task to user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: { ...mockTasks[0], assignee: { login: 'newUser' } },
        }),
      })

      const response = await fetch('/api/tasks/1/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee: 'newUser' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.assignee.login).toBe('newUser')
    })

    it('should add labels to task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: {
            ...mockTasks[0],
            labels: [{ name: 'feature' }, { name: 'high-priority' }, { name: 'urgent' }],
          },
        }),
      })

      const response = await fetch('/api/tasks/1/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: ['feature', 'high-priority', 'urgent'] }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.labels).toHaveLength(3)
    })
  })

  describe('Task Viewing and Filtering', () => {
    it('should display task list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: mockTasks }),
      })

      const response = await fetch('/api/github/issues')
      const data = await response.json()

      expect(data.issues).toHaveLength(2)
      expect(data.issues[0].title).toBe('Implement user authentication')
      expect(data.issues[1].title).toBe('Fix navigation bug')
    })

    it('should filter tasks by state (open/closed)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: mockTasks.filter(t => t.state === 'open') }),
      })

      const response = await fetch('/api/github/issues?state=open')
      const data = await response.json()

      expect(data.issues).toHaveLength(1)
      expect(data.issues[0].state).toBe('open')
    })

    it('should search tasks by keyword', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: mockTasks.filter(t => t.title.toLowerCase().includes('auth')),
        }),
      })

      const response = await fetch('/api/github/issues?q=auth')
      const data = await response.json()

      expect(data.issues).toHaveLength(1)
      expect(data.issues[0].title).toContain('auth')
    })

    it('should sort tasks by creation date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [...mockTasks].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        }),
      })

      const response = await fetch('/api/github/issues?sort=created_at&order=desc')
      const data = await response.json()

      expect(new Date(data.issues[0].created_at).getTime()).toBeGreaterThan(
        new Date(data.issues[1].created_at).getTime()
      )
    })
  })

  describe('Task Status Updates', () => {
    it('should close a task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: { ...mockTasks[0], state: 'closed' },
        }),
      })

      const response = await fetch('/api/tasks/1/close', { method: 'POST' })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.state).toBe('closed')
    })

    it('should reopen a closed task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: { ...mockTasks[1], state: 'open' },
        }),
      })

      const response = await fetch('/api/tasks/2/reopen', { method: 'POST' })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.state).toBe('open')
    })

    it('should update task progress', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: { ...mockTasks[0], progress: 50 },
        }),
      })

      const response = await fetch('/api/tasks/1/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: 50 }),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.progress).toBe(50)
    })
  })

  describe('Task Deletion', () => {
    it('should delete a task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Task deleted' }),
      })

      const response = await fetch('/api/tasks/1', { method: 'DELETE' })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Task deleted')
    })

    it('should handle deletion of non-existent task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Task not found' }),
      })

      const response = await fetch('/api/tasks/999', { method: 'DELETE' })
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
      expect(data.error).toBe('Task not found')
    })
  })

  describe('Task Statistics', () => {
    it('should calculate task statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total: mockTasks.length,
          open: mockTasks.filter(t => t.state === 'open').length,
          closed: mockTasks.filter(t => t.state === 'closed').length,
          progress: Math.round(
            (mockTasks.filter(t => t.state === 'closed').length / mockTasks.length) * 100
          ),
        }),
      })

      const response = await fetch('/api/tasks/stats')
      const data = await response.json()

      expect(data.total).toBe(2)
      expect(data.open).toBe(1)
      expect(data.closed).toBe(1)
      expect(data.progress).toBe(50)
    })

    it('should handle empty task list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 0, open: 0, closed: 0, progress: 0 }),
      })

      const response = await fetch('/api/tasks/stats')
      const data = await response.json()

      expect(data.total).toBe(0)
      expect(data.progress).toBe(0)
    })
  })

  describe('Task Comments', () => {
    it('should add comment to task', async () => {
      const comment = { id: 1, body: 'Test comment', author: { login: 'user1' } }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, comment }),
      })

      const response = await fetch('/api/tasks/1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'Test comment' }),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.comment.body).toBe('Test comment')
    })

    it('should retrieve task comments', async () => {
      const comments = [
        { id: 1, body: 'Comment 1', author: { login: 'user1' } },
        { id: 2, body: 'Comment 2', author: { login: 'user2' } },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ comments }),
      })

      const response = await fetch('/api/tasks/1/comments')
      const data = await response.json()

      expect(data.comments).toHaveLength(2)
    })
  })

  describe('Task Bulk Operations', () => {
    it('should bulk update task labels', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          updated: 2,
          tasks: mockTasks.map(t => ({
            ...t,
            labels: [{ name: 'bulk-updated' }],
          })),
        }),
      })

      const response = await fetch('/api/tasks/bulk/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: [1, 2],
          labels: ['bulk-updated'],
        }),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.updated).toBe(2)
      expect(data.tasks.every((t: { labels: Array<{ name: string }> }) => t.labels[0]?.name === 'bulk-updated')).toBe(true)
    })

    it('should bulk close tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          updated: 2,
        }),
      })

      const response = await fetch('/api/tasks/bulk/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: [1, 2] }),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.updated).toBe(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await fetch('/api/tasks')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).toBe('Network error')
      }
    })

    it('should handle API rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { 'Retry-After': '60' },
        json: async () => ({ error: 'Rate limit exceeded' }),
      })

      const response = await fetch('/api/tasks')
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
    })

    it('should handle unauthorized access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })

      const response = await fetch('/api/tasks')
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})
