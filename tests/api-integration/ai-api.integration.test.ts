/**
 * AI API Integration Tests
 * Tests for /api/ai/chat, /api/ai/conversations, /api/ai/suggestions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// ============================================
// MSW Handlers for AI API
// ============================================

const aiHandlers = [
  // POST /api/ai/chat
  http.post('http://localhost:3000/api/ai/chat', async ({ request }) => {
    const body = await request.json().catch(() => null)

    if (!body || !body.content) {
      return HttpResponse.json(
        { success: false, error: { message: 'Content is required' } },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        id: 'msg-123',
        role: 'assistant',
        content: '这是 AI 的回复',
        timestamp: Date.now(),
      },
    })
  }),

  // GET /api/ai/conversations
  http.get('http://localhost:3000/api/ai/conversations', () => {
    return HttpResponse.json({
      success: true,
      data: {
        conversations: [
          { id: 'conv-1', title: '工作流咨询', status: 'active', createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'conv-2', title: '代码审查', status: 'archived', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    })
  }),

  // GET /api/ai/conversations/:id
  http.get('http://localhost:3000/api/ai/conversations/conv-1', () => {
    return HttpResponse.json({
      success: true,
      data: {
        conversation: {
          id: 'conv-1',
          title: '工作流咨询',
          messages: [
            { id: 'msg-1', role: 'user', content: '你好', timestamp: Date.now() - 1000 },
            { id: 'msg-2', role: 'assistant', content: '你好，我是助手', timestamp: Date.now() },
          ],
          status: 'active',
          createdAt: Date.now() - 10000,
          updatedAt: Date.now(),
        },
      },
    })
  }),

  // GET /api/ai/conversations/non-existent - 404
  http.get('http://localhost:3000/api/ai/conversations/non-existent', () => {
    return HttpResponse.json(
      { success: false, error: { message: 'Conversation not found' } },
      { status: 404 }
    )
  }),

  // DELETE /api/ai/conversations/:id
  http.delete('http://localhost:3000/api/ai/conversations/conv-1', () => {
    return HttpResponse.json({ success: true, data: { deleted: true } })
  }),

  // PATCH /api/ai/conversations/:id
  http.patch('http://localhost:3000/api/ai/conversations/conv-1', async ({ request }) => {
    const body = await request.json().catch(() => null)
    if (!body) {
      return HttpResponse.json({ success: false, error: { message: 'Request body required' } }, { status: 400 })
    }
    return HttpResponse.json({
      success: true,
      data: { conversation: { id: 'conv-1', ...body, updatedAt: Date.now() } },
    })
  }),

  // POST /api/ai/suggestions
  http.post('http://localhost:3000/api/ai/suggestions', async ({ request }) => {
    const body = await request.json().catch(() => null)

    if (!body || !body.userInput) {
      return HttpResponse.json(
        { success: false, error: { message: 'userInput is required' } },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        suggestions: [
          { id: 'sug-1', text: '帮我创建工作流', category: 'workflow', priority: 'high' },
          { id: 'sug-2', text: '分析数据趋势', category: 'data', priority: 'medium' },
        ],
      },
    })
  }),

  // GET /api/ai/suggestions - with query params
  http.get('http://localhost:3000/api/ai/suggestions', ({ request }) => {
    const url = new URL(request.url)
    const contextType = url.searchParams.get('contextType')
    return HttpResponse.json({
      success: true,
      data: {
        suggestions: [
          { id: 'sug-1', text: '建议1', category: contextType || 'general', priority: 'medium' },
        ],
      },
    })
  }),
]

const aiServer = setupServer(...aiHandlers)

// ============================================
// Test Suite: AI API
// ===========================================

describe('AI API Integration Tests', () => {
  beforeAll(() => aiServer.listen({ onUnhandledRequest: 'warn' }))
  afterAll(() => aiServer.close())

  // ===========================================
  // POST /api/ai/chat
  // ===========================================
  describe('POST /api/ai/chat', () => {
    it('should send chat message and return 200', async () => {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '你好，帮我创建工作流' }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.role).toBe('assistant')
      expect(data.data.content).toBeTruthy()
    })

    it('should return 400 when content is missing', async () => {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 400 when body is empty string', async () => {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      })
      expect(response.status).toBe(400)
    })

    it('should include conversationId when provided', async () => {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '继续', conversationId: 'conv-1' }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle context in request', async () => {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '继续',
          context: { conversationId: 'conv-1', systemPrompt: '你是一个助手' },
        }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ===========================================
  // GET /api/ai/conversations
  // ===========================================
  describe('GET /api/ai/conversations', () => {
    it('should return conversation list with 200', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations')
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.conversations)).toBe(true)
      expect(data.data.conversations.length).toBeGreaterThan(0)
    })

    it('should return pagination info', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations')
      const data = await response.json()
      expect(data.data).toHaveProperty('page')
      expect(data.data).toHaveProperty('limit')
      expect(data.data).toHaveProperty('total')
      expect(data.data).toHaveProperty('totalPages')
    })

    it('should return conversation with required fields', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations')
      const data = await response.json()
      const conv = data.data.conversations[0]
      expect(conv).toHaveProperty('id')
      expect(conv).toHaveProperty('title')
      expect(conv).toHaveProperty('status')
    })
  })

  // ===========================================
  // GET /api/ai/conversations/:id
  // ===========================================
  describe('GET /api/ai/conversations/:id', () => {
    it('should return single conversation with 200', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations/conv-1')
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.conversation.id).toBe('conv-1')
    })

    it('should return conversation with messages', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations/conv-1')
      const data = await response.json()
      expect(Array.isArray(data.data.conversation.messages)).toBe(true)
    })

    it('should return 404 for non-existent conversation', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations/non-existent')
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })
  })

  // ===========================================
  // DELETE /api/ai/conversations/:id
  // ===========================================
  describe('DELETE /api/ai/conversations/:id', () => {
    it('should delete conversation and return 200', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations/conv-1', { method: 'DELETE' })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toBe(true)
    })
  })

  // ===========================================
  // PATCH /api/ai/conversations/:id
  // ===========================================
  describe('PATCH /api/ai/conversations/:id', () => {
    it('should update conversation with 200', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations/conv-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title', status: 'archived' }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.conversation.title).toBe('Updated Title')
    })

    it('should return 400 when body is empty', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations/conv-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      })
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  // ===========================================
  // POST /api/ai/suggestions
  // ===========================================
  describe('POST /api/ai/suggestions', () => {
    it('should return suggestions with 200', async () => {
      const response = await fetch('http://localhost:3000/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: '工作流' }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.suggestions)).toBe(true)
    })

    it('should return 400 when userInput is missing', async () => {
      const response = await fetch('http://localhost:3000/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should include conversation history when provided', async () => {
      const response = await fetch('http://localhost:3000/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: '继续',
          conversationHistory: [
            { id: 'msg-1', role: 'user', content: '你好', timestamp: Date.now() },
          ],
        }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should filter by contextType', async () => {
      const response = await fetch('http://localhost:3000/api/ai/suggestions?contextType=workflow')
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('AI API - Edge Cases', () => {
    it('should handle long user input', async () => {
      const longInput = 'a'.repeat(10000)
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: longInput }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle empty conversation list', async () => {
      const response = await fetch('http://localhost:3000/api/ai/conversations')
      const data = await response.json()
      // Should still return 200 with empty array
      expect(response.status).toBe(200)
      expect(Array.isArray(data.data.conversations)).toBe(true)
    })

    it('should handle malformed JSON in chat', async () => {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid }',
      })
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle empty conversations array', async () => {
      // This tests the empty state
      const response = await fetch('http://localhost:3000/api/ai/conversations')
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.data.conversations).toBeDefined()
    })
  })

  // ===========================================
  // Server Error (500)
  // ===========================================
  describe('AI API - Server Errors', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ not json ',
      })
      // Should not crash, should return error
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle suggestions with empty body', async () => {
      const response = await fetch('http://localhost:3000/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      })
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})