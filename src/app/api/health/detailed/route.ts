import { enhancedHealthReport, comprehensiveHealthReport, healthResponse, DetailedHealthReport, ComponentStatus } from '@/lib/monitoring';
import { NextResponse } from 'next/server';

/**
 * GET /api/health/detailed
 * Enhanced comprehensive health report with:
 * - System resources (memory, CPU, process info)
 * - Database connection status
 * - Redis connection status (actual ping)
 * - Email services (Resend, EmailJS)
 * - Analytics services (Umami, Plausible, GA)
 * - Monitoring (Sentry)
 * - External API checks (GitHub)
 * - Configuration status (env vars, security settings)
 * - Component status (cache, auth, logger)
 * - Performance metrics (response time, memory, CPU)
 * - Health check history (optional)
 * 
 * Query params:
 * - include: comma-separated list of sections to include (system,services,configuration,components,history)
 * - history: include health check history (true/false)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const include = url.searchParams.get('include');
    const includeHistory = url.searchParams.get('history') === 'true';

    // Get both enhanced report (with components and performance) and comprehensive report (with system/services)
    const [health, detailed] = await Promise.all([
      enhancedHealthReport(includeHistory),
      comprehensiveHealthReport(),
    ]);

    // Merge the reports
    const merged = {
      ...detailed,
      ...health,
      components: health.components,
      // Ensure system, services, configuration come from detailed report
      system: detailed.system,
      services: detailed.services,
      configuration: detailed.configuration,
    };

    // Allow filtering response via query params
    if (include) {
      const parts = include.split(',').map(p => p.trim());
      const filtered: Record<string, unknown> = {
        status: merged.status,
        timestamp: merged.timestamp,
        version: merged.version,
        uptime: merged.uptime,
        environment: merged.environment,
        responseTime: merged.responseTime,
      };

      if (parts.includes('system')) {
        filtered.system = merged.system;
      }
      if (parts.includes('services')) {
        filtered.services = merged.services;
      }
      if (parts.includes('configuration')) {
        filtered.configuration = merged.configuration;
      }
      if (parts.includes('components')) {
        filtered.components = merged.components;
      }
      if (parts.includes('history') && includeHistory && merged.history) {
        filtered.history = merged.history;
      }

      return NextResponse.json(filtered, {
        status: merged.status === 'ok' ? 200 : merged.status === 'degraded' ? 200 : 503
      });
    }

    return healthResponse(merged);
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
