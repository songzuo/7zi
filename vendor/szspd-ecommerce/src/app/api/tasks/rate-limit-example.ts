/**
 * API Route: /api/tasks
 *
 * This is an example of how to integrate rate limiting for the tasks API.
 *
 * To enable rate limiting, simply wrap your handler with `withRateLimit`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, getRateLimitStatus } from '@/lib/rate-limit'

/**
 * GET /api/tasks
 * Get all tasks (with rate limiting)
 */
export const GET = withRateLimit(async (req: NextRequest) => {
  try {
    // Your existing logic here
    const tasks = await getTasks()

    return NextResponse.json({
      success: true,
      data: tasks,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch tasks',
        },
      },
      { status: 500 }
    )
  }
})

/**
 * POST /api/tasks
 * Create a new task (with stricter rate limiting)
 */
export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = await req.json()

      // Your existing logic here
      const task = await createTask(body)

      return NextResponse.json({
        success: true,
        data: task,
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Failed to create task',
          },
        },
        { status: 500 }
      )
    }
  },
  {
    windowMs: 60000, // 1 minute
    maxRequests: 30, // Stricter limit for POST
  }
)

/**
 * GET /api/tasks/status
 * Get rate limit status for current user
 */
export async function GET_STATUS(req: NextRequest) {
  const identifier = getUserIdFromRequest(req)
  const status = await getRateLimitStatus('/api/tasks', identifier)

  return NextResponse.json({
    success: true,
    data: {
      rateLimit: status,
    },
  })
}

// Mock functions (replace with your actual implementation)
async function getTasks() {
  return [
    { id: 1, title: 'Task 1' },
    { id: 2, title: 'Task 2' },
  ]
}

async function createTask(data: Record<string, unknown>) {
  return {
    id: Date.now(),
    ...data,
  }
}

function getUserIdFromRequest(req: NextRequest): string {
  // Try to get user ID from token or session
  const userId = req.headers.get('x-user-id')
  if (userId) {
    return `user:${userId}`
  }

  // Fallback to IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  return `ip:${ip}`
}
