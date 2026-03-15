/**
 * Tasks API - AI Assignment 端点测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/tasks/[id]/assign/route'

// Mock auth modules
vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn().mockResolvedValue({
    sub: 'test-user',
    email: 'test@example.com',
    role: 'admin',
  }),
  extractToken: vi.fn().mockReturnValue('mock-token'),
}))

// Mock AI team service
vi.mock('@/lib/services/task-dashboard-integration', () => ({
  getAITeamForTaskAssignment: vi.fn(() => [
    {
      id: 'agent-world-expert',
      name: '智能体世界专家',
      expertise: ['research', 'strategy'],
      status: 'available',
      completedTasks: 10,
    },
    {
      id: 'architect',
      name: '架构师',
      expertise: ['development', 'architecture'],
      status: 'available',
      completedTasks: 15,
    },
    {
      id: 'consultant',
      name: '咨询师',
      expertise: ['research', 'analysis'],
      status: 'busy',
      completedTasks: 8,
    },
    {
      id: 'executor',
      name: '执行者',
      expertise: ['development', 'testing'],
      status: 'available',
      completedTasks: 20,
    },
  ]),
}))

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    audit: vi.fn(),
  },
}))

describe('Tasks Assignment API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/tasks/:id/assign', () => {
    it('should return assignment suggestions', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-001/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-001' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      // When returning suggestions (without auto-assign), success is false
      expect(data.success).toBe(false)
      expect(data.suggestions).toBeDefined()
      expect(Array.isArray(data.suggestions)).toBe(true)
    })

    it('should require authentication', async () => {
      const { extractToken } = await import('@/lib/security/auth')
      vi.mocked(extractToken).mockReturnValueOnce(null)

      const request = new NextRequest('http://localhost/api/tasks/task-001/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-001' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Authentication')
    })

    it('should return 404 for non-existent task', async () => {
      const request = new NextRequest('http://localhost/api/tasks/non-existent/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should auto-assign when autoAssign is true', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-001/assign', {
        method: 'POST',
        body: JSON.stringify({ autoAssign: true }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-001' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.assignedTo).toBeDefined()
      expect(data.assignedTo.id).toBeDefined()
      expect(data.assignedTo.name).toBeDefined()
    })

    it('should assign to preferred member when specified', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-001/assign', {
        method: 'POST',
        body: JSON.stringify({ preferredMemberId: 'architect' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-001' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.assignedTo.id).toBe('architect')
    })

    it('should return 400 for invalid preferred member', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-001/assign', {
        method: 'POST',
        body: JSON.stringify({ preferredMemberId: 'non-existent-member' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-001' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('not available')
    })

    it('should sort suggestions by confidence', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-001/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-001' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Verify suggestions are sorted by confidence (highest first)
      const suggestions = data.suggestions
      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].confidence).toBeGreaterThanOrEqual(suggestions[i + 1].confidence)
      }
    })

    it('should include reason in suggestions', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-001/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-001' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      data.suggestions.forEach((suggestion: { reason: string }) => {
        expect(suggestion.reason).toBeDefined()
        expect(typeof suggestion.reason).toBe('string')
      })
    })

    it('should limit suggestions to top 5', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-001/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-001' }) })
      const data = await response.json()

      expect(data.suggestions.length).toBeLessThanOrEqual(5)
    })

    it('should handle task with research type', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-002/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-002' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      // Research tasks should prioritize agents with research expertise
      const topSuggestion = data.suggestions[0]
      expect(topSuggestion.memberId).toMatch(/agent-world-expert|consultant/)
    })

    it('should handle task with development type', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-003/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-003' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      // Development tasks should prioritize agents with development expertise
      const topSuggestion = data.suggestions[0]
      expect(topSuggestion.memberId).toMatch(/architect|executor/)
    })
  })

  describe('AI Assignment Logic', () => {
    it('should prioritize available agents over busy ones', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-001/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-001' }) })
      const data = await response.json()

      // Find suggestions for available vs busy agents
      const availableSuggestions = data.suggestions.filter(
        (s: { memberId: string }) => s.memberId !== 'consultant'
      )
      const busySuggestions = data.suggestions.filter(
        (s: { memberId: string }) => s.memberId === 'consultant'
      )

      // Available agents should generally score higher
      if (availableSuggestions.length > 0 && busySuggestions.length > 0) {
        expect(availableSuggestions[0].confidence).toBeGreaterThanOrEqual(busySuggestions[0].confidence)
      }
    })

    it('should include experience bonus in scoring', async () => {
      const request = new NextRequest('http://localhost/api/tasks/task-003/assign', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'task-003' }) })
      const data = await response.json()

      // Executor has most completed tasks (20), should be mentioned in reason
      const executorSuggestion = data.suggestions.find(
        (s: { memberId: string }) => s.memberId === 'executor'
      )
      
      if (executorSuggestion) {
        expect(executorSuggestion.reason).toMatch(/经验|completed/i)
      }
    })
  })
})