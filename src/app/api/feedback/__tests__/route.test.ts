/**
 * Tests for Feedback API routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, GET_FEEDBACK, PATCH, DELETE_FEEDBACK } from '@/app/api/feedback/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/db/index', () => ({
  getDatabaseAsync: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/api/api-logger', () => ({
  logRequestStart: vi.fn(() => ({ path: '/api/feedback', method: 'GET' })),
  logRequestComplete: vi.fn(),
  logRequestError: vi.fn(),
}))

vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  createErrorResponse: vi.fn(error => {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  createValidationError: vi.fn(message => {
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  createUnauthorizedError: vi.fn(message => {
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  createForbiddenError: vi.fn(message => {
    return new Response(JSON.stringify({ error: message }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  createNotFoundError: vi.fn(message => {
    return new Response(JSON.stringify({ error: message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
}))

vi.mock('@/lib/db/query-optimizations', () => ({
  getOptimizedFeedbackStats: vi.fn(() =>
    Promise.resolve({
      average: 3.5,
      total: 50,
      byStatus: { pending: 10, reviewed: 20, resolved: 20 },
      byType: { bug: 15, feature: 20, improvement: 15 },
    })
  ),
}))

const mockDb = {
  get: vi.fn(),
  query: vi.fn(),
  queryRows: vi.fn(),
  exec: vi.fn(),
  prepare: vi.fn(),
  pragma: vi.fn(),
  batch: vi.fn(),
}

// Get the mocked function
const { getDatabaseAsync } = await import('@/lib/db/index')

describe('GET /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDatabaseAsync).mockResolvedValue(mockDb)
  })

  it('should return feedbacks list', async () => {
    mockDb.queryRows.mockReturnValueOnce([{ total: 3 }]).mockReturnValueOnce([
      {
        id: '1',
        user_id: 'user1',
        type: 'bug',
        rating: 2,
        title: 'Bug report',
        description: 'Something is broken',
        metadata: JSON.stringify({ severity: 'high' }),
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ])

    const request = new NextRequest('http://localhost/api/feedback')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data.feedbacks)).toBe(true)
    expect(data.meta).toBeDefined()
    expect(data.stats).toBeDefined()
  })

  it('should apply filters', async () => {
    mockDb.queryRows.mockReturnValueOnce([{ total: 1 }]).mockReturnValueOnce([])

    const request = new NextRequest(
      'http://localhost/api/feedback?type=bug&status=pending&priority=high'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('should handle search query', async () => {
    mockDb.queryRows.mockReturnValueOnce([{ total: 1 }]).mockReturnValueOnce([])

    const request = new NextRequest('http://localhost/api/feedback?search=crash')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('title LIKE ? OR description LIKE ?'),
      expect.arrayContaining(['%crash%', '%crash%'])
    )
  })

  it('should handle pagination', async () => {
    mockDb.queryRows.mockReturnValueOnce([{ total: 100 }]).mockReturnValueOnce([])

    const request = new NextRequest('http://localhost/api/feedback?page=3&per_page=20')
    const response = await GET(request)

    const data = await response.json()
    expect(data.meta.page).toBe(3)
    expect(data.meta.per_page).toBe(20)
    expect(data.meta.total_pages).toBe(5)
  })

  it('should limit per_page to maximum 100', async () => {
    mockDb.queryRows.mockReturnValueOnce([{ total: 0 }]).mockReturnValueOnce([])

    const request = new NextRequest('http://localhost/api/feedback?per_page=200')
    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('should handle date range filters', async () => {
    mockDb.queryRows.mockReturnValueOnce([{ total: 0 }]).mockReturnValueOnce([])

    const request = new NextRequest(
      'http://localhost/api/feedback?start_date=2024-01-01&end_date=2024-12-31'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDatabaseAsync).mockResolvedValue(mockDb)
  })

  it('should create a new feedback', async () => {
    const feedbackData = {
      type: 'bug',
      rating: 2,
      title: 'Bug found',
      description: 'Something is not working',
      email: 'user@example.com',
    }

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO feedbacks'),
      expect.any(Array)
    )
  })

  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ rating: 5 }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should validate rating range', async () => {
    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bug',
        rating: 6,
        title: 'Test',
        description: 'Test',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should validate title length', async () => {
    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bug',
        rating: 5,
        title: 'a'.repeat(101),
        description: 'Test',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should validate description length', async () => {
    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bug',
        rating: 5,
        title: 'Test',
        description: 'a'.repeat(1001),
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should detect spam', async () => {
    const { detectSpam } = require('@/lib/feedback/anti-spam')
    detectSpam.mockResolvedValueOnce({ is_spam: true, reason: 'Spam detected', score: 0.95 })

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bug',
        rating: 1,
        title: 'Spam title',
        description: 'Spam description',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should handle image attachments', async () => {
    const feedbackData = {
      type: 'bug',
      rating: 2,
      title: 'Bug with screenshot',
      description: 'See screenshot',
      images: [{ name: 'screenshot.png', size: 1024, type: 'image/png' }],
    }

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO feedback_attachments'),
      expect.any(Array)
    )
  })

  it('should handle errors', async () => {
    mockDb.exec.mockImplementationOnce(() => {
      throw new Error('Database error')
    })

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bug',
        rating: 2,
        title: 'Test',
        description: 'Test',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
  })
})

describe('GET_FEEDBACK /api/feedback/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDatabaseAsync).mockResolvedValue(mockDb)
  })

  it('should return single feedback', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      type: 'bug',
      rating: 2,
      metadata: JSON.stringify({ severity: 'high' }),
    })

    const request = new NextRequest('http://localhost/api/feedback/1')
    const response = await GET_FEEDBACK(request, { params: { id: '1' } })

    expect(response.status).toBe(200)
  })

  it('should return 404 for non-existent feedback', async () => {
    mockDb.queryRows.mockReturnValueOnce(undefined)

    const request = new NextRequest('http://localhost/api/feedback/999')
    const response = await GET_FEEDBACK(request, { params: { id: '999' } })

    expect(response.status).toBe(404)
  })
})

describe('PATCH /api/feedback/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDatabaseAsync).mockResolvedValue(mockDb)
  })

  it('should update feedback status', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      status: 'pending',
    })

    const request = new NextRequest('http://localhost/api/feedback/1', {
      method: 'PATCH',
      body: JSON.stringify({
        admin_id: 'admin',
        status: 'reviewed',
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(200)
  })

  it('should set reviewed_at timestamp', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      status: 'pending',
      reviewed_at: null,
    })

    const request = new NextRequest('http://localhost/api/feedback/1', {
      method: 'PATCH',
      body: JSON.stringify({
        admin_id: 'admin',
        status: 'reviewed',
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(200)
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('reviewed_at = ?'),
      expect.any(Array)
    )
  })

  it('should set resolved_at timestamp', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      status: 'reviewed',
      resolved_at: null,
    })

    const request = new NextRequest('http://localhost/api/feedback/1', {
      method: 'PATCH',
      body: JSON.stringify({
        admin_id: 'admin',
        status: 'resolved',
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(200)
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('resolved_at = ?'),
      expect.any(Array)
    )
  })

  it('should update priority', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      priority: 'low',
    })

    const request = new NextRequest('http://localhost/api/feedback/1', {
      method: 'PATCH',
      body: JSON.stringify({
        admin_id: 'admin',
        priority: 'high',
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(200)
  })

  it('should update admin_notes', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
    })

    const request = new NextRequest('http://localhost/api/feedback/1', {
      method: 'PATCH',
      body: JSON.stringify({
        admin_id: 'admin',
        admin_notes: 'Investigated and fixed',
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(200)
  })

  it('should reject non-admin updates', async () => {
    const request = new NextRequest('http://localhost/api/feedback/1', {
      method: 'PATCH',
      body: JSON.stringify({
        admin_id: 'user',
        status: 'reviewed',
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(403)
  })

  it('should return 404 for non-existent feedback', async () => {
    mockDb.queryRows.mockReturnValueOnce(undefined)

    const request = new NextRequest('http://localhost/api/feedback/999', {
      method: 'PATCH',
      body: JSON.stringify({
        admin_id: 'admin',
        status: 'reviewed',
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(404)
  })
})

describe('DELETE_FEEDBACK /api/feedback/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDatabaseAsync).mockResolvedValue(mockDb)
  })

  it('should delete feedback', async () => {
    mockDb.queryRows.mockReturnValueOnce({
      id: '1',
      type: 'bug',
    })

    const request = new NextRequest('http://localhost/api/feedback/1', {
      method: 'DELETE',
    })

    const response = await DELETE_FEEDBACK(request, { params: { id: '1' } })

    expect(response.status).toBe(200)
    expect(mockDb.exec).toHaveBeenCalledWith('DELETE FROM feedbacks WHERE id = ?', ['1'])
  })

  it('should return 404 for non-existent feedback', async () => {
    mockDb.queryRows.mockReturnValueOnce(undefined)

    const request = new NextRequest('http://localhost/api/feedback/999', {
      method: 'DELETE',
    })

    const response = await DELETE_FEEDBACK(request, { params: { id: '1' } })

    expect(response.status).toBe(404)
  })

  it('should handle errors', async () => {
    mockDb.queryRows.mockReturnValueOnce({ id: '1' })
    mockDb.exec.mockImplementationOnce(() => {
      throw new Error('Database error')
    })

    const request = new NextRequest('http://localhost/api/feedback/1', {
      method: 'DELETE',
    })

    const response = await DELETE_FEEDBACK(request, { params: { id: '1' } })

    expect(response.status).toBe(500)
  })
})
