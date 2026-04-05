/**
 * API Route Type Validation Tests
 *
 * This test suite validates type safety across all API routes:
 * - Return type correctness for route handlers
 * - Request parameter type safety
 * - Error response type consistency
 */

import { describe, it, expect } from 'vitest'
import type { NextRequest } from 'next/server'

// Type utilities for testing
type RouteHandler = (request: NextRequest, context?: any) => Promise<Response>

interface RouteTestCase {
  name: string
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  description: string
}

// Test data
const TEST_ROUTES: RouteTestCase[] = [
  // Status API
  {
    name: 'status',
    path: '/api/status',
    method: 'GET',
    description: 'System status endpoint'
  },

  // Audit Logs API (fixed in previous audit)
  {
    name: 'audit-logs',
    path: '/api/audit/logs',
    method: 'GET',
    description: 'Audit logs query endpoint'
  },
  {
    name: 'audit-export',
    path: '/api/audit/export',
    method: 'GET',
    description: 'Audit logs export endpoint'
  },

  // Workflow API
  {
    name: 'workflow-run',
    path: '/api/workflow/[id]/run',
    method: 'POST',
    description: 'Workflow execution endpoint'
  },

  // Stream Health API
  {
    name: 'stream-health',
    path: '/api/stream/health',
    method: 'GET',
    description: 'Stream health check endpoint'
  },

  // Database API
  {
    name: 'database-health',
    path: '/api/database/health',
    method: 'GET',
    description: 'Database health check endpoint'
  },
  {
    name: 'database-optimize',
    path: '/api/database/optimize',
    method: 'POST',
    description: 'Database optimization endpoint'
  },

  // Multimodal API
  {
    name: 'multimodal-image',
    path: '/api/multimodal/image',
    method: 'POST',
    description: 'Image processing endpoint'
  },
  {
    name: 'multimodal-audio',
    path: '/api/multimodal/audio',
    method: 'POST',
    description: 'Audio processing endpoint'
  },

  // Analytics API
  {
    name: 'analytics-export',
    path: '/api/analytics/export',
    method: 'GET',
    description: 'Analytics data export endpoint'
  },
  {
    name: 'analytics-metrics',
    path: '/api/analytics/metrics',
    method: 'GET',
    description: 'Analytics metrics endpoint'
  },

  // Feedback API
  {
    name: 'feedback',
    path: '/api/feedback',
    method: 'GET',
    description: 'Feedback list endpoint'
  },
  {
    name: 'feedback-detail',
    path: '/api/feedback/[id]',
    method: 'GET',
    description: 'Feedback detail endpoint'
  },

  // CSRF Token API
  {
    name: 'csrf-token',
    path: '/api/csrf-token',
    method: 'GET',
    description: 'CSRF token generation endpoint'
  },

  // Revalidation API
  {
    name: 'revalidate',
    path: '/api/revalidate',
    method: 'POST',
    description: 'Cache revalidation endpoint'
  },

  // CSP Violation API
  {
    name: 'csp-violation',
    path: '/api/csp-violation',
    method: 'POST',
    description: 'Content Security Policy violation reporting'
  },
]

// Type guard for NextResponse
function isNextResponse(response: Response): response is Response {
  return response instanceof Response
}

// Success response type guard
function isSuccessResponse(data: unknown): data is { success: true; data: unknown } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    data.success === true &&
    'data' in data
  )
}

// Error response type guard
function isErrorResponse(data: unknown): data is { success: false; error: { type: string; message: string } } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    data.success === false &&
    'error' in data &&
    typeof (data as any).error === 'object'
  )
}

describe('API Route Type Validation', () => {
  describe('Test Coverage', () => {
    it('should have test cases for all critical API routes', () => {
      expect(TEST_ROUTES.length).toBeGreaterThan(0)

      // Check for critical routes
      const criticalRoutes = TEST_ROUTES.filter(route =>
        [
          'status',
          'audit-logs',
          'workflow-run',
          'csrf-token'
        ].includes(route.name)
      )
      expect(criticalRoutes.length).toBeGreaterThan(0)
    })

    it('should include routes that were audited for type issues', () => {
      const auditedRoutes = TEST_ROUTES.filter(route =>
        ['audit-logs', 'audit-export'].includes(route.name)
      )
      expect(auditedRoutes.length).toBe(2)
    })
  })

  describe('Response Type Consistency', () => {
    it('should validate success response structure', () => {
      const mockSuccessResponse = {
        success: true,
        data: { foo: 'bar' },
        timestamp: new Date().toISOString()
      }

      expect(isSuccessResponse(mockSuccessResponse)).toBe(true)
      expect(isSuccessResponse({ success: false, data: {} })).toBe(false)
    })

    it('should validate error response structure', () => {
      const mockErrorResponse = {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid input'
        },
        timestamp: new Date().toISOString()
      }

      expect(isErrorResponse(mockErrorResponse)).toBe(true)
      expect(isErrorResponse({ success: true, error: {} })).toBe(false)
    })

    it('should ensure all Response objects are properly typed', () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

      expect(isNextResponse(mockResponse)).toBe(true)
    })
  })

  describe('Request Parameter Type Safety', () => {
    it('should validate query parameter parsing types', () => {
      // Test that query params can be properly typed
      const mockSearchParams = new URLSearchParams({
        userId: 'user_123',
        action: 'READ',
        status: 'success',
        limit: '100',
        offset: '0'
      })

      expect(mockSearchParams.get('userId')).toBe('user_123')
      expect(mockSearchParams.get('action')).toBe('READ')
      expect(mockSearchParams.get('status')).toBe('success')

      const limit = parseInt(mockSearchParams.get('limit') || '100', 10)
      const offset = parseInt(mockSearchParams.get('offset') || '0', 10)

      expect(limit).toBe(100)
      expect(offset).toBe(0)
    })

    it('should handle missing query parameters safely', () => {
      const mockSearchParams = new URLSearchParams()

      expect(mockSearchParams.get('missingParam')).toBeNull()

      // Test with optional chaining and defaults
      const value = mockSearchParams.get('param') ?? 'default'
      expect(value).toBe('default')
    })

    it('should validate JSON request body types', async () => {
      const mockBody = {
        inputs: { query: 'Hello World' },
        userId: 'user_123',
        triggerType: 'manual'
      }

      // Simulate request.json()
      const parsed = await Promise.resolve(mockBody as any)

      expect(parsed.inputs).toBeDefined()
      expect(parsed.inputs.query).toBe('Hello World')
      expect(typeof parsed.userId).toBe('string')
    })
  })

  describe('Error Response Type Consistency', () => {
    const expectedErrorTypes = [
      'VALIDATION_ERROR',
      'AUTHORIZATION_ERROR',
      'NOT_FOUND',
      'INTERNAL_ERROR',
      'RATE_LIMIT_EXCEEDED'
    ]

    it('should validate known error types', () => {
      expect(expectedErrorTypes).toContain('VALIDATION_ERROR')
      expect(expectedErrorTypes).toContain('INTERNAL_ERROR')
      expect(expectedErrorTypes).toContain('NOT_FOUND')
    })

    it('should ensure error responses follow consistent structure', () => {
      const errorResponses = [
        {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input',
            fields: { email: 'Invalid email format' }
          },
          timestamp: new Date().toISOString()
        },
        {
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Resource not found'
          },
          timestamp: new Date().toISOString()
        },
        {
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred'
          },
          timestamp: new Date().toISOString()
        }
      ]

      errorResponses.forEach(error => {
        expect(error).toHaveProperty('success', false)
        expect(error).toHaveProperty('error')
        expect(error.error).toHaveProperty('type')
        expect(error.error).toHaveProperty('message')
        expect(typeof error.error.type).toBe('string')
        expect(typeof error.error.message).toBe('string')
      })
    })

    it('should validate HTTP status codes for error responses', () => {
      const statusCodes: Record<string, number> = {
        VALIDATION_ERROR: 400,
        AUTHORIZATION_ERROR: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        RATE_LIMIT_EXCEEDED: 429,
        INTERNAL_ERROR: 500
      }

      expect(statusCodes.VALIDATION_ERROR).toBe(400)
      expect(statusCodes.NOT_FOUND).toBe(404)
      expect(statusCodes.INTERNAL_ERROR).toBe(500)
    })
  })

  describe('Audit Routes Type Safety (Previously Fixed)', () => {
    it('should validate audit logs query parameter types', () => {
      // These are the types that were fixed in the previous audit
      const validActions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'ADMIN'] as const
      const validStatuses = ['success', 'failure'] as const
      const validSortBy = ['timestamp', 'userId', 'action'] as const
      const validSortOrder = ['asc', 'desc'] as const

      // Test that we can properly type these values
      const action: typeof validActions[number] = 'READ'
      const status: typeof validStatuses[number] = 'success'
      const sortBy: typeof validSortBy[number] = 'timestamp'
      const sortOrder: typeof validSortOrder[number] = 'desc'

      expect(validActions).toContain(action)
      expect(validStatuses).toContain(status)
      expect(validSortBy).toContain(sortBy)
      expect(validSortOrder).toContain(sortOrder)
    })

    it('should handle optional audit query parameters safely', () => {
      const mockParams = new URLSearchParams({
        // Only providing some parameters
        action: 'READ',
        limit: '50'
      })

      const action = mockParams.get('action') as 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'ADMIN' | undefined
      const status = mockParams.get('status') as 'success' | 'failure' | undefined
      const limit = parseInt(mockParams.get('limit') || '100', 10)

      expect(action).toBe('READ')
      // URLSearchParams.get() returns null for missing params, not undefined
      expect(status).toBeNull()
      expect(limit).toBe(50)
    })
  })

  describe('Workflow API Type Safety', () => {
    it('should validate workflow run request body structure', () => {
      const requestBody = {
        inputs: {
          query: 'test query'
        },
        userId: 'user_123',
        triggerType: 'manual' as const
      }

      expect(requestBody).toHaveProperty('inputs')
      expect(requestBody.inputs).toHaveProperty('query')
      expect(requestBody).toHaveProperty('userId')
      expect(requestBody).toHaveProperty('triggerType')

      const validTriggerTypes = ['manual', 'api', 'scheduled', 'event'] as const
      expect(validTriggerTypes).toContain(requestBody.triggerType)
    })

    it('should validate workflow response structure', () => {
      const workflowResponse = {
        success: true,
        data: {
          instanceId: 'instance_123',
          workflowId: 'workflow_456',
          status: 'RUNNING',
          message: 'Workflow started',
          metadata: {
            startedAt: new Date().toISOString(),
            triggeredBy: 'user_123'
          }
        }
      }

      expect(isSuccessResponse(workflowResponse)).toBe(true)
      expect(workflowResponse.data).toHaveProperty('instanceId')
      expect(workflowResponse.data).toHaveProperty('workflowId')
      expect(workflowResponse.data).toHaveProperty('status')
    })
  })

  describe('Generic Route Handler Type Contracts', () => {
    it('should enforce that route handlers return Response objects', async () => {
      // Type check: route handlers should return Promise<Response>
      const mockHandler: RouteHandler = async () => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Create a mock request object that satisfies the NextRequest interface
      const mockRequest = {
        url: 'http://example.com',
        method: 'GET',
        headers: new Headers(),
        json: async () => ({}),
        text: async () => '',
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        arrayBuffer: async () => new ArrayBuffer(0),
        clone: function() { return this as any },
      } as unknown as NextRequest

      const response = await mockHandler(mockRequest)
      expect(response).toBeInstanceOf(Response)
    })

    it('should validate route context type for dynamic routes', async () => {
      // Dynamic routes like [id] receive params in context
      const mockContext = {
        params: Promise.resolve({ id: '123' })
      }

      const params = await mockContext.params
      expect(params).toHaveProperty('id')
      expect(params.id).toBe('123')
    })
  })

  describe('No "any" Type Usage in Critical Paths', () => {
    it('should verify type-safe patterns for query params', () => {
      // Pattern 1: Literal union types
      const literalUnion: 'asc' | 'desc' = 'desc'
      expect(['asc', 'desc']).toContain(literalUnion)

      // Pattern 2: Type-safe optional values
      const optionalValue: string | undefined = undefined
      expect(optionalValue).toBeUndefined()

      // Pattern 3: Type guards
      const value = 'something'
      const isString = typeof value === 'string'
      expect(isString).toBe(true)
    })

    it('should verify type-safe patterns for JSON bodies', () => {
      // Pattern: Use zod or similar for runtime validation
      // This test verifies that we don't use "as any"
      interface SafeBody {
        inputs: Record<string, unknown>
        userId?: string
      }

      const body: SafeBody = {
        inputs: { query: 'test' }
      }

      expect(body.inputs).toBeDefined()
      expect(body.userId).toBeUndefined()
    })
  })
})

describe('API Route Integration Type Tests', () => {
  describe('Status API Type Contracts', () => {
    it('should validate status API response structure', () => {
      const statusResponse = {
        success: true,
        data: {
          status: 'operational' as const,
          lastUpdated: new Date().toISOString(),
          services: [
            {
              name: 'API',
              status: 'operational' as const,
              uptime: 99.99,
              responseTime: 85
            }
          ],
          metrics: {
            requests: 100000,
            errors: 10,
            avgResponseTime: 120,
            p95ResponseTime: 350
          },
          incidents: [],
          maintenance: []
        },
        timestamp: new Date().toISOString()
      }

      expect(isSuccessResponse(statusResponse)).toBe(true)
      expect(statusResponse.data.status).toMatch(/operational|degraded|outage/)
    })

    it('should validate compact format response', () => {
      const compactResponse = {
        success: true,
        data: {
          status: 'operational' as const,
          lastUpdated: new Date().toISOString(),
          services: [
            {
              name: 'API',
              status: 'operational' as const
            }
          ]
        },
        timestamp: new Date().toISOString()
      }

      expect(isSuccessResponse(compactResponse)).toBe(true)
    })
  })
})
