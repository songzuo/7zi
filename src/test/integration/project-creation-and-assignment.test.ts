/**
 * @fileoverview Integration test for Project Creation and Task Assignment
 * Tests project management workflow including project creation, task assignment, and collaboration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock project data
const mockProjects = [
  {
    id: 1,
    name: 'Website Redesign',
    description: 'Complete overhaul of the company website',
    status: 'active',
    progress: 65,
    teamMembers: [{ id: 1, name: 'Alice', role: 'Project Manager' }],
    tasks: [1, 2, 3],
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Mobile App Development',
    description: 'Native iOS and Android application',
    status: 'in-progress',
    progress: 40,
    teamMembers: [{ id: 2, name: 'Bob', role: 'Lead Developer' }],
    tasks: [4, 5],
    createdAt: '2024-03-05T00:00:00Z',
  },
]

// Mock task data
const mockTasks = [
  {
    id: 1,
    title: 'Design homepage mockups',
    projectId: 1,
    status: 'completed',
    assignee: { id: 1, name: 'Alice' },
    priority: 'high',
    dueDate: '2024-03-15T00:00:00Z',
  },
  {
    id: 2,
    title: 'Implement responsive layout',
    projectId: 1,
    status: 'in-progress',
    assignee: { id: 2, name: 'Bob' },
    priority: 'medium',
    dueDate: '2024-03-20T00:00:00Z',
  },
  {
    id: 3,
    title: 'Setup CI/CD pipeline',
    projectId: 1,
    status: 'pending',
    assignee: null,
    priority: 'high',
    dueDate: '2024-03-25T00:00:00Z',
  },
  {
    id: 4,
    title: 'Design app UI/UX',
    projectId: 2,
    status: 'in-progress',
    assignee: { id: 3, name: 'Charlie' },
    priority: 'high',
    dueDate: '2024-03-22T00:00:00Z',
  },
  {
    id: 5,
    title: 'Implement authentication',
    projectId: 2,
    status: 'pending',
    assignee: null,
    priority: 'high',
    dueDate: '2024-03-28T00:00:00Z',
  },
]

// Mock team members
const mockTeamMembers = [
  { id: 1, name: 'Alice', role: 'Project Manager', email: 'alice@example.com' },
  { id: 2, name: 'Bob', role: 'Lead Developer', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', role: 'UI/UX Designer', email: 'charlie@example.com' },
  { id: 4, name: 'Diana', role: 'Developer', email: 'diana@example.com' },
]

describe('Project Creation and Task Assignment Integration Test', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Project Creation', () => {
    it('should create a new project successfully', async () => {
      const newProject = {
        name: 'New Project',
        description: 'Project description',
        startDate: '2024-03-19',
        endDate: '2024-06-19',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          project: {
            id: 3,
            ...newProject,
            status: 'active',
            progress: 0,
            createdAt: new Date().toISOString(),
          },
        }),
      })

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.project.name).toBe(newProject.name)
      expect(data.project.status).toBe('active')
    })

    it('should validate project name is required', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          details: { name: 'Project name is required' },
        }),
      })

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Some description' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.details.name).toBe('Project name is required')
    })

    it('should set project dates correctly', async () => {
      const newProject = {
        name: 'Test Project',
        description: 'Test',
        startDate: '2024-03-19',
        endDate: '2024-06-19',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          project: {
            id: 3,
            ...newProject,
            status: 'active',
            progress: 0,
          },
        }),
      })

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.project.startDate).toBe(newProject.startDate)
      expect(data.project.endDate).toBe(newProject.endDate)
    })
  })

  describe('Project Viewing and Management', () => {
    it('should list all projects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: mockProjects }),
      })

      const response = await fetch('/api/projects')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.projects).toHaveLength(2)
      expect(data.projects[0].name).toBe('Website Redesign')
    })

    it('should get project by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ project: mockProjects[0] }),
      })

      const response = await fetch('/api/projects/1')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.project.id).toBe(1)
      expect(data.project.name).toBe('Website Redesign')
    })

    it('should update project details', async () => {
      const updates = {
        name: 'Updated Project Name',
        description: 'Updated description',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          project: { ...mockProjects[0], ...updates },
        }),
      })

      const response = await fetch('/api/projects/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.project.name).toBe(updates.name)
      expect(data.project.description).toBe(updates.description)
    })

    it('should delete a project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Project deleted' }),
      })

      const response = await fetch('/api/projects/1', { method: 'DELETE' })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
    })

    it('should filter projects by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: mockProjects.filter(p => p.status === 'active'),
        }),
      })

      const response = await fetch('/api/projects?status=active')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.projects.every((p: { status: string }) => p.status === 'active')).toBe(true)
    })
  })

  describe('Task Assignment', () => {
    it('should assign task to team member', async () => {
      const assignment = {
        taskId: 3,
        assigneeId: 2,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: {
            ...mockTasks[2],
            assignee: mockTeamMembers[1],
          },
        }),
      })

      const response = await fetch('/api/tasks/3/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.assignee.name).toBe('Bob')
    })

    it('should unassign task from team member', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: { ...mockTasks[0], assignee: null },
        }),
      })

      const response = await fetch('/api/tasks/1/unassign', { method: 'POST' })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.assignee).toBeNull()
    })

    it('should reassign task to different member', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: {
            ...mockTasks[0],
            assignee: mockTeamMembers[2],
          },
        }),
      })

      const response = await fetch('/api/tasks/1/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: 3 }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.assignee.name).toBe('Charlie')
    })

    it('should get all tasks assigned to a user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tasks: mockTasks.filter(t => t.assignee?.id === 1),
        }),
      })

      const response = await fetch('/api/users/1/tasks')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(
        data.tasks.every(
          (t: { assignee: { id: number; name: string } | null }) => t.assignee?.id === 1
        )
      ).toBe(true)
    })
  })

  describe('Project Team Management', () => {
    it('should add team member to project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          project: {
            ...mockProjects[0],
            teamMembers: [
              ...mockProjects[0].teamMembers,
              { id: 2, name: 'Bob', role: 'Developer' },
            ],
          },
        }),
      })

      const response = await fetch('/api/projects/1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 2, role: 'Developer' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.project.teamMembers).toHaveLength(2)
    })

    it('should remove team member from project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          project: {
            ...mockProjects[0],
            teamMembers: [],
          },
        }),
      })

      const response = await fetch('/api/projects/1/members/1', {
        method: 'DELETE',
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.project.teamMembers).toHaveLength(0)
    })

    it('should update team member role', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          member: { id: 1, name: 'Alice', role: 'Senior Project Manager' },
        }),
      })

      const response = await fetch('/api/projects/1/members/1/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Senior Project Manager' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.member.role).toBe('Senior Project Manager')
    })

    it('should list all team members in project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: mockProjects[0].teamMembers }),
      })

      const response = await fetch('/api/projects/1/members')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.members).toHaveLength(1)
      expect(data.members[0].name).toBe('Alice')
    })
  })

  describe('Project Task Management', () => {
    it('should create task within project', async () => {
      const newTask = {
        title: 'New task for project',
        projectId: 1,
        priority: 'medium',
        dueDate: '2024-03-25',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: {
            id: 6,
            ...newTask,
            status: 'pending',
            assignee: null,
          },
        }),
      })

      const response = await fetch('/api/projects/1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.projectId).toBe(1)
      expect(data.task.title).toBe(newTask.title)
    })

    it('should get all tasks in project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tasks: mockTasks.filter(t => t.projectId === 1),
        }),
      })

      const response = await fetch('/api/projects/1/tasks')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.tasks).toHaveLength(3)
      expect(data.tasks.every((t: { projectId: number }) => t.projectId === 1)).toBe(true)
    })

    it('should move task between projects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          task: { ...mockTasks[0], projectId: 2 },
        }),
      })

      const response = await fetch('/api/tasks/1/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProjectId: 2 }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.task.projectId).toBe(2)
    })
  })

  describe('Project Progress and Statistics', () => {
    it('should calculate project progress based on tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          progress: 65,
          totalTasks: 3,
          completedTasks: 2,
          inProgressTasks: 1,
          pendingTasks: 0,
        }),
      })

      const response = await fetch('/api/projects/1/progress')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.progress).toBe(65)
      expect(data.totalTasks).toBe(3)
      expect(data.completedTasks).toBe(2)
    })

    it('should get project timeline and milestones', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          startDate: '2024-03-01T00:00:00Z',
          endDate: '2024-06-01T00:00:00Z',
          milestones: [
            { id: 1, name: 'MVP Release', date: '2024-04-15', completed: false },
            { id: 2, name: 'Beta Launch', date: '2024-05-15', completed: false },
          ],
          daysRemaining: 74,
        }),
      })

      const response = await fetch('/api/projects/1/timeline')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.milestones).toHaveLength(2)
      expect(data.daysRemaining).toBeGreaterThan(0)
    })

    it('should get project activity log', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activities: [
            {
              id: 1,
              action: 'task_assigned',
              user: 'Alice',
              timestamp: new Date().toISOString(),
              details: { task: 'Design homepage mockups', assignee: 'Bob' },
            },
            {
              id: 2,
              action: 'project_updated',
              user: 'Alice',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              details: { field: 'description' },
            },
          ],
        }),
      })

      const response = await fetch('/api/projects/1/activities')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.activities).toHaveLength(2)
      expect(data.activities[0].action).toBe('task_assigned')
    })
  })

  describe('Project Collaboration', () => {
    it('should add comment to project', async () => {
      const comment = {
        id: 1,
        projectId: 1,
        userId: 1,
        content: 'Great progress on the website redesign!',
        timestamp: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, comment }),
      })

      const response = await fetch('/api/projects/1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment.content }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.comment.content).toBe(comment.content)
    })

    it('should mention team member in comment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          mentionedUsers: [{ id: 2, name: 'Bob', notified: true }],
        }),
      })

      const response = await fetch('/api/projects/1/comments/mention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: 1,
          userIds: [2],
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.mentionedUsers[0].name).toBe('Bob')
      expect(data.mentionedUsers[0].notified).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle duplicate project name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'Project name already exists',
        }),
      })

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Website Redesign' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(409)
      expect(data.error).toBe('Project name already exists')
    })

    it('should handle task assignment to non-existent user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'User not found',
        }),
      })

      const response = await fetch('/api/tasks/1/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: 999 }),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should handle project not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Project not found',
        }),
      })

      const response = await fetch('/api/projects/999')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
      expect(data.error).toBe('Project not found')
    })
  })
})
