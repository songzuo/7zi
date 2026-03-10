import { comprehensiveHealthReport, healthResponse } from '@/lib/monitoring';
import { NextResponse } from 'next/server';

/**
 * GET /api/health/detailed
 * Comprehensive health report with system resources, services status, and configuration
 * 
 * Response includes:
 * - System resources (memory, CPU, process info)
 * - Database connection status
 * - Redis connection status
 * - Email services (Resend, EmailJS)
 * - Analytics services (Umami, Plausible, GA)
 * - Monitoring (Sentry)
 * - External API checks (GitHub)
 * - Configuration status (env vars, security settings)
 */
export async function GET(request: Request) {
  try {
    const health = await comprehensiveHealthReport();
    
    // Allow filtering response via query params
    const url = new URL(request.url);
    const include = url.searchParams.get('include');
    
    if (include) {
      const parts = include.split(',').map(p => p.trim());
      const filtered: Record<string, unknown> = {
        status: health.status,
        timestamp: health.timestamp,
        version: health.version,
        uptime: health.uptime,
        environment: health.environment,
      };
      
      if (parts.includes('system')) {
        filtered.system = health.system;
      }
      if (parts.includes('services')) {
        filtered.services = health.services;
      }
      if (parts.includes('configuration')) {
        filtered.configuration = health.configuration;
      }
      
      return NextResponse.json(filtered, { 
        status: health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503 
      });
    }
    
    return healthResponse(health);
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error during health check',
      },
      { status: 500 }
    );
  }
}

/**
 * HEAD /api/health/detailed
 * Lightweight check for load balancers
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}