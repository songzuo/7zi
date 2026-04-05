/**
 * API Route: Rate Limit Rules Management
 * API 路由：限流规则管理
 *
 * GET    /api/admin/rate-limit/rules - List all rules
 * POST   /api/admin/rate-limit/rules - Create new rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { repositories } from '@/lib/rate-limit-dashboard/database'
import type {
  CreateRateLimitRuleDTO,
  RuleFilters,
  ApiResponse,
  ApiError,
} from '@/lib/rate-limit-dashboard/types'
import { logger } from '@/lib/logger'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
} from '@/lib/api/error-handler'

// ============================================================================
// Validation Schemas
// ============================================================================

const createRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  pattern: z.string().min(1, 'Pattern is required').max(200, 'Pattern too long'),
  algorithm: z.enum(['sliding-window', 'token-bucket'], {
    message: 'Algorithm must be sliding-window or token-bucket',
  }),
  windowMs: z.number().min(1000, 'Window must be at least 1 second').max(86400000, 'Window too long'),
  maxRequests: z.number().min(1, 'Max requests must be at least 1').max(10000, 'Max requests too high'),
  keyType: z.enum(['ip', 'user', 'api-key', 'custom'], {
    message: 'Key type must be ip, user, api-key, or custom',
  }),
  priority: z.number().min(0, 'Priority must be non-negative').max(100, 'Priority too high').optional(),
  enabled: z.boolean().optional(),
})

const listRulesSchema = z.object({
  enabled: z.coerce.boolean().optional(),
  algorithm: z.enum(['sliding-window', 'token-bucket']).optional(),
  keyType: z.enum(['ip', 'user', 'api-key', 'custom']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user is authenticated and has admin privileges
 */
async function checkAuth(request: NextRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')

  // TODO: Implement proper JWT verification
  // For now, just check if token exists
  if (!token || token === 'invalid') {
    return { success: false, error: 'Invalid token' }
  }

  // Extract user ID from token (simplified)
  try {
    // In production, verify JWT signature and claims
    const userId = 'admin' // Default admin user for now
    return { success: true, userId }
  } catch (error) {
    return { success: false, error: 'Token verification failed' }
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  return 'unknown'
}

// ============================================================================
// GET Handler - List Rules
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await checkAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const validation = listRulesSchema.safeParse(queryParams)
    if (!validation.success) {
      return createValidationError('Invalid query parameters', validation.error.flatten().fieldErrors)
    }

    const filters: RuleFilters = {
      enabled: validation.data.enabled,
      algorithm: validation.data.algorithm,
      keyType: validation.data.keyType,
      search: validation.data.search,
    }

    const pagination = {
      page: validation.data.page,
      limit: validation.data.limit,
    }

    // Fetch rules
    const result = await repositories.rateLimitRules.findAll(filters, pagination)

    // Log access
    logger.info('Rate limit rules listed', {
      userId: auth.userId,
      filters,
      pagination: result.meta,
      ip: getClientIP(request),
      category: 'rate-limit',
    })

    return NextResponse.json({
      success: true,
      data: {
        rules: result.items,
        pagination: result.meta,
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    logger.error('Failed to list rate limit rules', error, { category: 'rate-limit' })
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}

// ============================================================================
// POST Handler - Create Rule
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await checkAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate request body
    const validation = createRuleSchema.safeParse(body)
    if (!validation.success) {
      return createValidationError('Invalid request body', validation.error.flatten().fieldErrors)
    }

    const ruleData: CreateRateLimitRuleDTO = validation.data

    // Create rule
    const rule = await repositories.rateLimitRules.create(ruleData)

    // Audit log
    await repositories.auditLog.create({
      action: 'CREATE_RATE_LIMIT_RULE',
      userId: auth.userId!,
      resource: 'rate-limit-rule',
      resourceId: rule.id,
      details: {
        ruleName: rule.name,
        pattern: rule.pattern,
        algorithm: rule.algorithm,
      },
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      createdAt: Date.now(),
    })

    // Log creation
    logger.info('Rate limit rule created', {
      ruleId: rule.id,
      ruleName: rule.name,
      userId: auth.userId,
      ip: getClientIP(request),
      category: 'rate-limit',
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          rule,
        },
        timestamp: Date.now(),
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Failed to create rate limit rule', error, { category: 'rate-limit' })
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}

// ============================================================================
// Options Handler - CORS
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
