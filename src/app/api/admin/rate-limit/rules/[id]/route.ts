/**
 * API Route: Rate Limit Rule Operations
 * API 路由：限流规则操作
 *
 * GET    /api/admin/rate-limit/rules/:id - Get single rule
 * PUT    /api/admin/rate-limit/rules/:id - Update rule
 * DELETE /api/admin/rate-limit/rules/:id - Delete rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { repositories } from '@/lib/rate-limit-dashboard/database'
import type { UpdateRateLimitRuleDTO } from '@/lib/rate-limit-dashboard/types'
import { logger } from '@/lib/logger'
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundError,
  createValidationError,
} from '@/lib/api/error-handler'

// ============================================================================
// Validation Schemas
// ============================================================================

const updateRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  pattern: z.string().min(1, 'Pattern is required').max(200, 'Pattern too long').optional(),
  algorithm: z.enum(['sliding-window', 'token-bucket']).optional(),
  windowMs: z.number().min(1000, 'Window must be at least 1 second').max(86400000, 'Window too long').optional(),
  maxRequests: z.number().min(1, 'Max requests must be at least 1').max(10000, 'Max requests too high').optional(),
  keyType: z.enum(['ip', 'user', 'api-key', 'custom']).optional(),
  priority: z.number().min(0, 'Priority must be non-negative').max(100, 'Priority too high').optional(),
  enabled: z.boolean().optional(),
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
  if (!token || token === 'invalid') {
    return { success: false, error: 'Invalid token' }
  }

  try {
    const userId = 'admin'
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

/**
 * Validate rule ID format
 */
function isValidRuleId(id: string): boolean {
  // Rule IDs should match the pattern: timestamp-randomstring
  return /^[0-9]{13}-[a-z0-9]{9}$/.test(id)
}

// ============================================================================
// GET Handler - Get Single Rule
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await checkAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    const ruleId = params.id

    // Validate rule ID
    if (!isValidRuleId(ruleId)) {
      return createValidationError('Invalid rule ID format', { id: 'Invalid format' })
    }

    // Fetch rule
    const rule = await repositories.rateLimitRules.findById(ruleId)

    if (!rule) {
      return createNotFoundError('Rate limit rule not found')
    }

    // Log access
    logger.info('Rate limit rule fetched', {
      ruleId,
      ruleName: rule.name,
      userId: auth.userId,
      ip: getClientIP(request),
      category: 'rate-limit',
    })

    return NextResponse.json({
      success: true,
      data: { rule },
      timestamp: Date.now(),
    })
  } catch (error) {
    logger.error('Failed to fetch rate limit rule', error, { category: 'rate-limit' })
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}

// ============================================================================
// PUT Handler - Update Rule
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await checkAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    const ruleId = params.id

    // Validate rule ID
    if (!isValidRuleId(ruleId)) {
      return createValidationError('Invalid rule ID format', { id: 'Invalid format' })
    }

    // Check if rule exists
    const existingRule = await repositories.rateLimitRules.findById(ruleId)
    if (!existingRule) {
      return createNotFoundError('Rate limit rule not found')
    }

    // Parse request body
    const body = await request.json()

    // Validate request body
    const validation = updateRuleSchema.safeParse(body)
    if (!validation.success) {
      return createValidationError('Invalid request body', validation.error.flatten().fieldErrors)
    }

    const updateData: UpdateRateLimitRuleDTO = validation.data

    // Update rule
    const updatedRule = await repositories.rateLimitRules.update(ruleId, updateData)

    if (!updatedRule) {
      return createNotFoundError('Rate limit rule not found')
    }

    // Audit log
    await repositories.auditLog.create({
      action: 'UPDATE_RATE_LIMIT_RULE',
      userId: auth.userId!,
      resource: 'rate-limit-rule',
      resourceId: ruleId,
      details: {
        ruleName: updatedRule.name,
        changes: updateData,
      },
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      createdAt: Date.now(),
    })

    // Log update
    logger.info('Rate limit rule updated', {
      ruleId,
      ruleName: updatedRule.name,
      userId: auth.userId,
      ip: getClientIP(request),
      changes: updateData,
      category: 'rate-limit',
    })

    return NextResponse.json({
      success: true,
      data: { rule: updatedRule },
      timestamp: Date.now(),
    })
  } catch (error) {
    logger.error('Failed to update rate limit rule', error, { category: 'rate-limit' })
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}

// ============================================================================
// DELETE Handler - Delete Rule
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await checkAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    const ruleId = params.id

    // Validate rule ID
    if (!isValidRuleId(ruleId)) {
      return createValidationError('Invalid rule ID format', { id: 'Invalid format' })
    }

    // Check if rule exists
    const existingRule = await repositories.rateLimitRules.findById(ruleId)
    if (!existingRule) {
      return createNotFoundError('Rate limit rule not found')
    }

    // Delete rule
    const deleted = await repositories.rateLimitRules.delete(ruleId)

    if (!deleted) {
      return createNotFoundError('Rate limit rule not found')
    }

    // Audit log
    await repositories.auditLog.create({
      action: 'DELETE_RATE_LIMIT_RULE',
      userId: auth.userId!,
      resource: 'rate-limit-rule',
      resourceId: ruleId,
      details: {
        ruleName: existingRule.name,
        pattern: existingRule.pattern,
        algorithm: existingRule.algorithm,
      },
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      createdAt: Date.now(),
    })

    // Log deletion
    logger.info('Rate limit rule deleted', {
      ruleId,
      ruleName: existingRule.name,
      userId: auth.userId,
      ip: getClientIP(request),
      category: 'rate-limit',
    })

    return NextResponse.json({
      success: true,
      message: 'Rate limit rule deleted successfully',
      timestamp: Date.now(),
    })
  } catch (error) {
    logger.error('Failed to delete rate limit rule', error, { category: 'rate-limit' })
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
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
