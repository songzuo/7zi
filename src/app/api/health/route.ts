import { NextResponse } from 'next/server';
import { basicHealthCheck } from '@/lib/monitoring';

/**
 * GET /api/health
 * Basic health check endpoint
 */
export async function GET() {
  const health = basicHealthCheck();
  return NextResponse.json(health, { status: 200 });
}

/**
 * HEAD /api/health
 * Lightweight health check for load balancers
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}