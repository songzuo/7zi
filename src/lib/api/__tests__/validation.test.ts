/**
 * API Validation Tests
 * Tests for API validation schemas and helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import {
  paginationSchema,
  ownerRepoSchema,
  githubCommitsQuerySchema,
  githubIssuesQuerySchema,
  statusQuerySchema,
  healthQuerySchema,
  databaseActionSchema,
  jsonRpcRequestSchema,
  jsonRpcBatchRequestSchema,
  jsonRpcResponseSchema,
  csrfTokenSchema,
  successResponseSchema,
  paginatedResponseSchema,
  validateQuery,
  validateBody,
  formatValidationErrors,
  withQueryValidation,
} from '../validation'

describe('API Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('paginationSchema', () => {
    it('should accept valid pagination parameters', () => {
      const result = paginationSchema.safeParse({ page: 2, per_page: 50 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.per_page).toBe(50)
      }
    })

    it('should use default values for pagination', () => {
      const result = paginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.per_page).toBe(20)
      }
    })

    it('should reject invalid page number', () => {
      const result = paginationSchema.safeParse({ page: 0 })
      expect(result.success).toBe(false)
    })

    it('should reject per_page greater than 100', () => {
      const result = paginationSchema.safeParse({ per_page: 101 })
      expect(result.success).toBe(false)
    })

    it('should coerce string numbers to integers', () => {
      const result = paginationSchema.safeParse({ page: '2', per_page: '30' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.per_page).toBe(30)
      }
    })
  })

  describe('ownerRepoSchema', () => {
    it('should accept valid owner and repo', () => {
      const result = ownerRepoSchema.safeParse({
        owner: 'test-owner',
        repo: 'test-repo',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.owner).toBe('test-owner')
        expect(result.data.repo).toBe('test-repo')
      }
    })

    it('should use default values for owner and repo', () => {
      const result = ownerRepoSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.owner).toBe('songzhuo')
        expect(result.data.repo).toBe('openclaw-workspace')
      }
    })

    it('should reject empty owner', () => {
      const result = ownerRepoSchema.safeParse({ owner: '', repo: 'test' })
      expect(result.success).toBe(false)
    })

    it('should reject owner longer than 100 characters', () => {
      const result = ownerRepoSchema.safeParse({
        owner: 'a'.repeat(101),
        repo: 'test',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('githubCommitsQuerySchema', () => {
    it('should merge pagination and owner repo schemas', () => {
      const result = githubCommitsQuerySchema.safeParse({
        page: 2,
        per_page: 30,
        owner: 'test-owner',
        repo: 'test-repo',
        sha: 'abc123',
        path: 'src/lib',
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid ISO 8601 datetime for since', () => {
      const result = githubCommitsQuerySchema.safeParse({
        since: '2024-01-01T00:00:00Z',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid datetime format', () => {
      const result = githubCommitsQuerySchema.safeParse({
        since: 'invalid-date',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('githubIssuesQuerySchema', () => {
    it('should accept valid issue query parameters', () => {
      const result = githubIssuesQuerySchema.safeParse({
        page: 1,
        per_page: 20,
        state: 'open',
        sort: 'created',
        direction: 'desc',
      })
      expect(result.success).toBe(true)
    })

    it('should use default values for issues query', () => {
      const result = githubIssuesQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.state).toBe('all')
        expect(result.data.sort).toBe('created')
        expect(result.data.direction).toBe('desc')
      }
    })

    it('should reject invalid state value', () => {
      const result = githubIssuesQuerySchema.safeParse({ state: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid sort value', () => {
      const result = githubIssuesQuerySchema.safeParse({ sort: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('statusQuerySchema', () => {
    it('should accept valid format parameter', () => {
      const result1 = statusQuerySchema.safeParse({ format: 'json' })
      const result2 = statusQuerySchema.safeParse({ format: 'compact' })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })

    it('should reject invalid format value', () => {
      const result = statusQuerySchema.safeParse({ format: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should coerce boolean strings', () => {
      const result = statusQuerySchema.safeParse({ include_metrics: 'true' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.include_metrics).toBe(true)
      }
    })
  })

  describe('healthQuerySchema', () => {
    it('should accept valid health query parameters', () => {
      const result = healthQuerySchema.safeParse({
        detailed: true,
        checks: 'github,email',
      })
      expect(result.success).toBe(true)
    })

    it('should use default value for detailed', () => {
      const result = healthQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.detailed).toBe(false)
      }
    })
  })

  describe('databaseActionSchema', () => {
    it('should accept valid database actions', () => {
      const actions = ['stats', 'health', 'optimize', 'backup'] as const
      actions.forEach(action => {
        const result = databaseActionSchema.safeParse({ action })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.action).toBe(action)
        }
      })
    })

    it('should reject invalid action', () => {
      const result = databaseActionSchema.safeParse({ action: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('JSON-RPC Schemas', () => {
    it('should validate jsonrpc version', () => {
      const result1 = jsonRpcRequestSchema.safeParse({
        jsonrpc: '2.0',
        method: 'test',
      })
      const result2 = jsonRpcRequestSchema.safeParse({
        jsonrpc: '2.0',
        method: 'test',
        params: { key: 'value' },
        id: 1,
      })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })

    it('should reject invalid jsonrpc version', () => {
      const result = jsonRpcRequestSchema.safeParse({
        jsonrpc: '1.0',
        method: 'test',
      })
      expect(result.success).toBe(false)
    })

    it('should validate batch requests', () => {
      const result = jsonRpcBatchRequestSchema.safeParse([
        { jsonrpc: '2.0', method: 'method1', id: 1 },
        { jsonrpc: '2.0', method: 'method2', id: 2 },
      ])
      expect(result.success).toBe(true)
    })

    it('should reject empty batch requests', () => {
      const result = jsonRpcBatchRequestSchema.safeParse([])
      expect(result.success).toBe(false)
    })

    it('should validate jsonrpc response', () => {
      const result1 = jsonRpcResponseSchema.safeParse({
        jsonrpc: '2.0',
        result: 'success',
        id: 1,
      })
      const result2 = jsonRpcResponseSchema.safeParse({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: null,
      })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })

  describe('csrfTokenSchema', () => {
    it('should accept valid 64-character CSRF token', () => {
      const token = 'a'.repeat(64)
      const result = csrfTokenSchema.safeParse({ csrfToken: token })
      expect(result.success).toBe(true)
    })

    it('should reject token that is not 64 characters', () => {
      const result = csrfTokenSchema.safeParse({ csrfToken: 'abc' })
      expect(result.success).toBe(false)
    })
  })

  describe('successResponseSchema', () => {
    it('should accept valid success response', () => {
      const schema = successResponseSchema(z.object({ message: z.string() }))
      const result = schema.safeParse({
        success: true,
        data: { message: 'test' },
        timestamp: new Date().toISOString(),
      })
      expect(result.success).toBe(true)
    })

    it('should reject non-boolean success', () => {
      const schema = successResponseSchema(z.object({ message: z.string() }))
      const result = schema.safeParse({
        success: 'true',
        data: { message: 'test' },
        timestamp: new Date().toISOString(),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('paginatedResponseSchema', () => {
    it('should accept valid paginated response', () => {
      const schema = paginatedResponseSchema(z.object({ name: z.string() }))
      const result = schema.safeParse({
        success: true,
        data: {
          items: [{ name: 'item1' }, { name: 'item2' }],
          pagination: {
            page: 1,
            per_page: 20,
            total: 100,
            total_pages: 5,
          },
        },
        timestamp: new Date().toISOString(),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('validateQuery', () => {
    it('should validate valid query parameters', () => {
      const searchParams = new URLSearchParams({
        page: '2',
        per_page: '30',
      })
      const result = validateQuery(searchParams, paginationSchema)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.per_page).toBe(30)
      }
    })

    it('should handle invalid query parameters', () => {
      const searchParams = new URLSearchParams({
        page: 'invalid',
      })
      const result = validateQuery(searchParams, paginationSchema)
      expect(result.success).toBe(false)
    })

    it('should handle array values', () => {
      const searchParams = new URLSearchParams()
      searchParams.append('tags', 'react')
      searchParams.append('tags', 'nextjs')

      const schema = z.object({
        tags: z.array(z.string()),
      })
      const result = validateQuery(searchParams, schema)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual(['react', 'nextjs'])
      }
    })
  })

  describe('validateBody', () => {
    it('should validate valid body', () => {
      const schema = z.object({
        email: z.string().email(),
        name: z.string(),
      })
      const result = validateBody({ email: 'test@example.com', name: 'John' }, schema)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.name).toBe('John')
      }
    })

    it('should reject invalid body', () => {
      const schema = z.object({
        email: z.string().email(),
      })
      const result = validateBody({ email: 'invalid' }, schema)
      expect(result.success).toBe(false)
    })

    it('should handle unknown body types', () => {
      const schema = z.object({ field: z.string() })
      const result = validateBody(null, schema)
      expect(result.success).toBe(false)
    })
  })

  describe('formatValidationErrors', () => {
    it('should format simple validation errors', () => {
      const error = z
        .object({
          email: z.string().email(),
          age: z.number().min(18),
        })
        .safeParse({ email: 'invalid', age: 10 })

      if (!error.success) {
        const formatted = formatValidationErrors(error.error)
        expect(formatted.email).toBeDefined()
        expect(formatted.age).toBeDefined()
        expect(typeof formatted.email).toBe('string')
        expect(typeof formatted.age).toBe('string')
      }
    })

    it('should handle nested path errors', () => {
      const error = z
        .object({
          user: z.object({
            profile: z.object({
              name: z.string().min(1),
            }),
          }),
        })
        .safeParse({
          user: {
            profile: {
              name: '',
            },
          },
        })

      if (!error.success) {
        const formatted = formatValidationErrors(error.error)
        expect(formatted['user.profile.name']).toBeDefined()
      }
    })

    it('should handle empty error issues', () => {
      const error = z.object({}).safeParse({})
      if (!error.success) {
        const formatted = formatValidationErrors(error.error)
        expect(Object.keys(formatted)).toHaveLength(0)
      }
    })
  })

  describe('withQueryValidation', () => {
    it('should call handler with validated data', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      const schema = z.object({ id: z.string() })
      const wrappedHandler = withQueryValidation(schema, mockHandler)

      const mockRequest = new Request('https://example.com/api/test?id=123', { method: 'GET' })

      await wrappedHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalledOnce()
      if (mockHandler.mock.calls[0]) {
        expect(mockHandler.mock.calls[0][0]).toEqual({ id: '123' })
      }
    })

    it('should return validation error for invalid query', async () => {
      const mockHandler = vi.fn()
      const schema = z.object({
        id: z.number().min(1),
      })
      const wrappedHandler = withQueryValidation(schema, mockHandler)

      const mockRequest = new Request('https://example.com/api/test?id=invalid', { method: 'GET' })

      const result = await wrappedHandler(mockRequest)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(result.status).toBe(400)
    })

    it('should pass original request to handler', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      })
      const schema = z.object({})
      const wrappedHandler = withQueryValidation(schema, mockHandler)

      const mockRequest = new Request('https://example.com/api/test', {
        method: 'GET',
      })

      await wrappedHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalledOnce()
      if (mockHandler.mock.calls[0] && mockHandler.mock.calls[0][1]) {
        expect(mockHandler.mock.calls[0][1]).toBe(mockRequest)
      }
    })
  })
})
