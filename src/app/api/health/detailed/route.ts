import { NextResponse } from 'next/server';
import { detailedHealthCheck, healthResponse } from '@/lib/monitoring';

/**
 * GET /api/health/detailed
 * Detailed health check with dependency status
 */
export async function GET() {
  const health = await detailedHealthCheck();
  return healthResponse(health);
}