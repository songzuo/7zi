/**
 * Status API
 * Returns public status information for the status page
 *
 * GET /api/status
 *
 * @refactored - Added parameter validation and improved error handling
 */

import {
  statusQuerySchema,
  validateQuery,
  formatValidationErrors,
} from '@/lib/api/validation';
import { createValidationError } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

interface Service {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime: number;
  responseTime: number;
}

interface Incident {
  id: string;
  title: string;
  status: 'resolved' | 'investigating' | 'monitoring';
  severity: 'minor' | 'major' | 'critical';
  startTime: string;
  endTime?: string;
  duration: number;
}

interface Maintenance {
  id: string;
  title: string;
  startTime: string;
  duration: number;
  description?: string;
}

interface Metrics {
  requests: number;
  errors: number;
  avgResponseTime: number;
  p95ResponseTime: number;
}

interface StatusResponse {
  success: true;
  data: {
    status: 'operational' | 'degraded' | 'outage';
    lastUpdated: string;
    services: Service[];
    metrics: Metrics;
    incidents: Incident[];
    maintenance: Maintenance[];
  };
  timestamp: string;
}

/**
 * Calculate uptime for last 30 days
 */
function calculate30DayUptime(): number {
  // Mock data - in production, calculate from actual uptime metrics
  return 99.98;
}

/**
 * Determine overall system status from services
 */
function determineOverallStatus(services: Service[]): 'operational' | 'degraded' | 'outage' {
  if (services.some(s => s.status === 'outage')) {
    return 'outage';
  }
  if (services.some(s => s.status === 'degraded')) {
    return 'degraded';
  }
  return 'operational';
}

/**
 * GET /api/status
 * Get system status information
 */
export async function GET(request: Request) {
  try {
    // Get and validate query parameters
    const url = new URL(request.url);
    const validation = validateQuery(url.searchParams, statusQuerySchema);

    if (!validation.success) {
      const errors = formatValidationErrors(validation.errors);
      return createValidationError('Invalid query parameters', { fields: errors });
    }

    const { format, include_metrics } = validation.data;

    const now = new Date();

    // Service status
    const services: Service[] = [
      {
        name: 'Website',
        status: 'operational',
        uptime: calculate30DayUptime(),
        responseTime: 120,
      },
      {
        name: 'API',
        status: 'operational',
        uptime: 99.99,
        responseTime: 85,
      },
      {
        name: 'CDN',
        status: 'operational',
        uptime: 99.99,
        responseTime: 45,
      },
    ];

    // Metrics (last 24h)
    const metrics: Metrics = {
      requests: 125000,
      errors: 23,
      avgResponseTime: 142,
      p95ResponseTime: 380,
    };

    // Determine overall status
    const overallStatus = determineOverallStatus(services);

    // Build response data
    const data = {
      status: overallStatus,
      lastUpdated: now.toISOString(),
      services,
      metrics: include_metrics ? metrics : undefined,
      incidents: [] as Incident[],
      maintenance: [] as Maintenance[],
    };

    // Handle compact format
    if (format === 'compact') {
      const compactData = {
        status: data.status,
        lastUpdated: data.lastUpdated,
        services: data.services.map(s => ({
          name: s.name,
          status: s.status,
        })),
      };

      return NextResponse.json({
        success: true,
        data: compactData,
        timestamp: now.toISOString(),
      } as StatusResponse);
    }

    // Return full response
    return NextResponse.json({
      success: true,
      data,
      timestamp: now.toISOString(),
    } as StatusResponse);

  } catch (_error) {
    logger.error('Failed to retrieve status information', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to retrieve status information',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
