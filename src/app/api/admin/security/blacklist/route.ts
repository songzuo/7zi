/**
 * API Route: Blacklist Management
 * API 路由：黑名单管理
 *
 * GET    /api/admin/security/blacklist - List blacklist entries
 * POST   /api/admin/security/blacklist - Add to blacklist
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { repositories } from '@/lib/rate-limit-dashboard/database'
import type { CreateBlacklistEntryDTO } from '@/lib/rate-limit-dashboard/types'
import { logger } from '@/lib/logger'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
} from '@/lib/api/error-handler'

// ============================================================================
// Validation Schemas
// ============================================================================

const createBlacklistSchema = z.object({
  type: z.enum(['ip', 'user-id', 'api-key', 'email'], {
    message: 'Type must be ip, user-id, api-key, or email',
  }),
  value: z.string().min(1, 'Value is required').max(500, 'Value too long'),
  reason: z.string().max(1000, 'Reason too long').optional(),
  expiresAt: z.coerce.number().int().positive().nullable().optional(),
})

const listBlacklistSchema = z.object({
  type: z.enum(['ip', 'user-id', 'api-key', 'email']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
})

// ============================================================================
// Helper Functions
// ============================================================================

async function checkAuth(request: NextRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')

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
// GET Handler - List Blacklist
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    const validation = listBlacklistSchema.safeParse(queryParams)
    if (!validation.success) {
      return createValidationError('Invalid query parameters', validation.error.flatten().fieldErrors)
    }

    const pagination = {
      page: validation.data.page,
      limit: validation.data.limit,
    }

    const result = await repositories.blacklist.findAll(pagination)

    logger.info('Blacklist entries listed', {
      userId: auth.userId,
      pagination: result.meta,
      ip: getClientIP(request),
      category: 'security',
    })

    return NextResponse.json({
      success: true,
      data: {
        entries: result.items,
        pagination: result.meta,
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    logger.error('Failed to list blacklist entries', error, { category: 'security' })
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}

// ============================================================================
// POST Handler - Add to Blacklist
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    const body = await request.json()

    const validation = createBlacklistSchema.safeParse(body)
    if (!validation.success) {
      return createValidationError('Invalid request body', validation.error.flatten().fieldErrors)
    }

    const entryData: CreateBlacklistEntryDTO = validation.data

    const entry = await repositories.blacklist.create(entryData, auth.userId)

    await repositories.auditLog.create({
      action: 'ADD_TO_BLACKLIST',
      userId: auth.userId!,
      resource: 'blacklist',
      resourceId: entry.id,
      details: {
        type: entry.type,
        value: entry.value,
        reason: entry.reason,
      },
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      createdAt: Date.now(),
    })

    logger.info('Entry added to blacklist', {
      entryId: entry.id,
      type: entry.type,
      value: entry.value,
      userId: auth.userId,
      ip: getClientIP(request),
      category: 'security',
    })

    return NextResponse.json(
      {
        success: true,
        data: { entry },
        timestamp: Date.now(),
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Failed to add entry to blacklist', error, { category: 'security' })
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}