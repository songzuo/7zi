/**
 * Example API Route with Monitoring
 * This shows the recommended pattern for all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMonitoring } from '@/lib/middleware';
import { logger } from '@/lib/logger';

// Handler implementation - separate from export for clarity
const handler = async (request: NextRequest) => {
  try {
    // Your business logic here
    // Example: Fetch data from database
    const data = await fetchData();

    logger.info('[Teams API] Successfully fetched teams', {
      count: data.length,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('[Teams API] Failed to fetch teams', error);

    // Re-throw error - monitoring wrapper will:
    // 1. Capture to Sentry
    // 2. Send alert if needed
    // 3. Log with request context
    throw error;
  }
};

// Export with monitoring wrapper
export const GET = withMonitoring(handler, {
  routeName: 'api.teams.list', // Specific route name for metrics
  alertThreshold: 1000,        // Alert if response > 1 second
  captureErrors: true,         // Send errors to Sentry
  alertOnSlowRequests: true,   // Send alert on slow requests
});

// POST handler example
export const POST = withMonitoring(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.name) {
      throw new Error('Team name is required');
    }

    // Create team
    const newTeam = await createTeam(body);

    logger.info('[Teams API] Successfully created team', {
      teamId: newTeam.id,
      name: newTeam.name,
    });

    return NextResponse.json({
      success: true,
      data: newTeam,
    }, { status: 201 });
  } catch (error) {
    logger.error('[Teams API] Failed to create team', error);
    throw error;
  }
}, {
  routeName: 'api.teams.create',
  alertThreshold: 2000,      // POST might be slower than GET
  captureErrors: true,
});

// ============================================
// Mock functions (replace with real implementation)
// ============================================

async function fetchData() {
  // Simulate database query
  return [
    { id: '1', name: 'Engineering' },
    { id: '2', name: 'Design' },
    { id: '3', name: 'Product' },
  ];
}

interface TeamData {
  name: string;
}

async function createTeam(data: TeamData) {
  // Simulate database insert
  return {
    id: crypto.randomUUID(),
    name: data.name,
    createdAt: new Date().toISOString(),
  };
}
