/**
 * Health Check Utilities
 * For monitoring application health
 */

import { NextResponse } from 'next/server';

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks?: Record<string, CheckResult>;
}

/**
 * Individual check result
 */
export interface CheckResult {
  status: 'ok' | 'error';
  latency?: number;
  message?: string;
}

/**
 * Basic health check
 * Returns simple status indicating service is running
 */
export function basicHealthCheck(): HealthStatus {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? 'unknown',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? 'unknown',
  };
}

/**
 * Detailed health check
 * Includes checks for external dependencies
 */
export async function detailedHealthCheck(): Promise<HealthStatus> {
  const checks: Record<string, CheckResult> = {};

  // Check external API (GitHub)
  checks.githubApi = await checkExternalService(
    'https://api.github.com/zen',
    5000,
    'GitHub API'
  );

  // Check email service (Resend)
  checks.emailService = await checkResendAPI();

  // Determine overall status
  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const someOk = Object.values(checks).some((c) => c.status === 'ok');

  return {
    status: allOk ? 'ok' : someOk ? 'degraded' : 'error',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? 'unknown',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? 'unknown',
    checks,
  };
}

/**
 * Check external service health
 */
async function checkExternalService(
  url: string,
  timeout: number,
  name: string
): Promise<CheckResult> {
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (response.ok) {
      return {
        status: 'ok',
        latency,
      };
    }

    return {
      status: 'error',
      latency,
      message: `${name} returned status ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Resend API health
 */
async function checkResendAPI(): Promise<CheckResult> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    return {
      status: 'ok', // Not configured, skip check
      message: 'Resend API key not configured',
    };
  }

  try {
    const start = Date.now();
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - start;

    if (response.ok || response.status === 401) {
      // 401 means API is reachable, just auth issue
      return {
        status: 'ok',
        latency,
      };
    }

    return {
      status: 'error',
      latency,
      message: `Resend API returned status ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create health check response
 */
export function healthResponse(status: HealthStatus): NextResponse {
  const statusCode = status.status === 'ok' ? 200 : status.status === 'degraded' ? 200 : 503;
  return NextResponse.json(status, { status: statusCode });
}

/**
 * Kubernetes-style probes
 */
export const probes = {
  /**
   * Liveness probe
   * Returns 200 if the service is running
   */
  liveness: () => {
    return NextResponse.json({ status: 'alive' }, { status: 200 });
  },

  /**
   * Readiness probe
   * Returns 200 if the service is ready to accept traffic
   */
  readiness: async () => {
    const health = await detailedHealthCheck();
    return healthResponse(health);
  },

  /**
   * Startup probe
   * Returns 200 if the service has started successfully
   */
  startup: () => {
    // Check if the application has completed startup
    const isReady = typeof globalThis !== 'undefined';
    return NextResponse.json(
      { status: isReady ? 'started' : 'starting' },
      { status: isReady ? 200 : 503 }
    );
  },
};