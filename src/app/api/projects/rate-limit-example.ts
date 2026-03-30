/**
 * API Route: /api/projects
 *
 * This is an example of how to integrate rate limiting for projects API.
 *
 * To enable rate limiting, simply wrap your handler with `withRateLimit`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, getRateLimitStatus } from '@/lib/rate-limit';

/**
 * GET /api/projects
 * Get all projects (with rate limiting)
 */
export const GET = withRateLimit(
  async (req: NextRequest) => {
    try {
      // Your existing logic here
      const projects = await getProjects();

      return NextResponse.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Failed to fetch projects',
          },
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/projects
 * Create a new project (with stricter rate limiting)
 */
export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Your existing logic here
      const project = await createProject(body);

      return NextResponse.json({
        success: true,
        data: project,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Failed to create project',
          },
        },
        { status: 500 }
      );
    }
  },
  {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
  }
);

/**
 * GET /api/projects/status
 * Get rate limit status for current user
 */
export async function GET_STATUS(req: NextRequest) {
  const identifier = getUserIdFromRequest(req);
  const status = await getRateLimitStatus('/api/projects', identifier);

  return NextResponse.json({
    success: true,
    data: {
      rateLimit: status,
    },
  });
}

// Mock functions (replace with your actual implementation)
async function getProjects() {
  return [
    { id: 1, name: 'Project 1' },
    { id: 2, name: 'Project 2' },
  ];
}

async function createProject(data: any) {
  return {
    id: Date.now(),
    ...data,
  };
}

function getUserIdFromRequest(req: NextRequest): string {
  // Try to get user ID from token or session
  const userId = req.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  return `ip:${ip}`;
}
