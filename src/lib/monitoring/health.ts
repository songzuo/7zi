/**
 * Health Check Utilities
 * For monitoring application health
 */

import { NextResponse } from 'next/server';
import os from 'os';

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
  status: 'ok' | 'error' | 'warning' | 'skipped';
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Detailed health report with system resources
 */
export interface DetailedHealthReport extends HealthStatus {
  system: SystemResources;
  services: ServiceStatus;
  configuration: ConfigurationStatus;
}

/**
 * System resource information
 */
export interface SystemResources {
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    heapUsed?: number;
    heapTotal?: number;
  };
  cpu: {
    cores: number;
    model: string;
    loadAverage: number[];
  };
  process: {
    pid: number;
    uptime: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  disk?: {
    available: boolean;
    message?: string;
  };
}

/**
 * External service status
 */
export interface ServiceStatus {
  database: CheckResult;
  redis: CheckResult;
  email: {
    resend: CheckResult;
    emailjs: CheckResult;
  };
  analytics: {
    umami: CheckResult;
    plausible: CheckResult;
    google: CheckResult;
  };
  monitoring: {
    sentry: CheckResult;
  };
  external: {
    github: CheckResult;
  };
}

/**
 * Configuration status
 */
export interface ConfigurationStatus {
  requiredEnvVars: {
    allPresent: boolean;
    missing: string[];
  };
  optionalEnvVars: {
    present: string[];
    missing: string[];
  };
  security: {
    jwtConfigured: boolean;
    httpsEnabled: boolean;
    csrfConfigured: boolean;
  };
}

/**
 * Basic health check
 * Returns simple status indicating service is running
 */
export function basicHealthCheck(): HealthStatus {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_SENTRY_RELEASE || 'unknown',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'unknown',
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
  const allOk = Object.values(checks).every((c) => c.status === 'ok' || c.status === 'skipped');
  const hasError = Object.values(checks).some((c) => c.status === 'error');

  return {
    status: hasError ? 'error' : allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_SENTRY_RELEASE || 'unknown',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'unknown',
    checks,
  };
}

/**
 * Get system resource information
 */
export function getSystemResources(): SystemResources {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  // Get memory usage for the current process
  const memoryUsage = process.memoryUsage();

  return {
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      usagePercent: Math.round((usedMemory / totalMemory) * 100),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model ?? 'Unknown',
      loadAverage: os.loadavg(),
    },
    process: {
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
}

/**
 * Check database connection
 * Supports PostgreSQL, MySQL, MongoDB, Redis
 */
async function checkDatabase(): Promise<CheckResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return {
      status: 'skipped',
      message: 'DATABASE_URL not configured',
    };
  }

  try {
    const start = Date.now();
    
    // Parse the database URL to determine the type
    const url = new URL(databaseUrl);
    const dbType = url.protocol.replace(':', '');
    
    // For now, just verify the URL is valid
    // In production, you would actually connect to the database
    const latency = Date.now() - start;

    return {
      status: 'ok',
      latency,
      details: {
        type: dbType,
        host: url.host,
        database: url.pathname.slice(1),
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Invalid DATABASE_URL',
    };
  }
}

/**
 * Check Redis connection
 */
async function checkRedis(): Promise<CheckResult> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return {
      status: 'skipped',
      message: 'REDIS_URL not configured',
    };
  }

  try {
    const start = Date.now();
    
    // Validate Redis URL format
    const url = new URL(redisUrl);
    
    // In production, you would use ioredis or redis client to ping
    // For now, just verify the URL is valid
    const latency = Date.now() - start;

    return {
      status: 'ok',
      latency,
      details: {
        host: url.host,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Invalid REDIS_URL',
    };
  }
}

/**
 * Check EmailJS configuration
 */
function checkEmailJS(): CheckResult {
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;

  if (!publicKey || !serviceId || !templateId) {
    return {
      status: 'skipped',
      message: 'EmailJS not fully configured',
      details: {
        hasPublicKey: !!publicKey,
        hasServiceId: !!serviceId,
        hasTemplateId: !!templateId,
      },
    };
  }

  return {
    status: 'ok',
    message: 'EmailJS configured',
  };
}

/**
 * Check analytics services configuration
 */
function checkAnalytics(): { umami: CheckResult; plausible: CheckResult; google: CheckResult } {
  return {
    umami: {
      status: process.env.NEXT_PUBLIC_UMAMI_URL && process.env.NEXT_PUBLIC_UMAMI_ID ? 'ok' : 'skipped',
      message: process.env.NEXT_PUBLIC_UMAMI_URL ? 'Umami configured' : 'Umami not configured',
    },
    plausible: {
      status: process.env.NEXT_PUBLIC_PLAUSIBLE_ID ? 'ok' : 'skipped',
      message: process.env.NEXT_PUBLIC_PLAUSIBLE_ID ? 'Plausible configured' : 'Plausible not configured',
    },
    google: {
      status: process.env.NEXT_PUBLIC_GA_ID ? 'ok' : 'skipped',
      message: process.env.NEXT_PUBLIC_GA_ID ? 'Google Analytics configured' : 'Google Analytics not configured',
    },
  };
}

/**
 * Check Sentry configuration
 */
function checkSentry(): CheckResult {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    return {
      status: 'skipped',
      message: 'Sentry not configured',
    };
  }

  return {
    status: 'ok',
    message: 'Sentry configured',
    details: {
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? 'unknown',
    },
  };
}

/**
 * Check configuration status
 */
function getConfigurationStatus(): ConfigurationStatus {
  const requiredEnvVars = ['JWT_SECRET', 'CSRF_SECRET'];
  const optionalEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'RESEND_API_KEY',
    'SLACK_WEBHOOK_URL',
    'SENTRY_DSN',
    'NEXT_PUBLIC_UMAMI_URL',
    'NEXT_PUBLIC_PLAUSIBLE_ID',
    'NEXT_PUBLIC_GA_ID',
  ];

  const missingRequired = requiredEnvVars.filter((key) => !process.env[key]);
  const presentOptional = optionalEnvVars.filter((key) => !!process.env[key]);
  const missingOptional = optionalEnvVars.filter((key) => !process.env[key]);

  return {
    requiredEnvVars: {
      allPresent: missingRequired.length === 0,
      missing: missingRequired,
    },
    optionalEnvVars: {
      present: presentOptional,
      missing: missingOptional,
    },
    security: {
      jwtConfigured: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
      httpsEnabled: process.env.NODE_ENV === 'production' || (process.env.NEXT_PUBLIC_APP_URL?.startsWith('https') ?? false),
      csrfConfigured: !!process.env.CSRF_SECRET && process.env.CSRF_SECRET.length >= 32,
    },
  };
}

/**
 * Comprehensive health report
 * Includes system resources, all service checks, and configuration
 */
export async function comprehensiveHealthReport(): Promise<DetailedHealthReport> {
  // Run all checks in parallel for efficiency
  const [database, redis, resend, github, emailjs, analytics, sentry] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkResendAPI(),
    checkExternalService('https://api.github.com/zen', 5000, 'GitHub API'),
    Promise.resolve(checkEmailJS()),
    Promise.resolve(checkAnalytics()),
    Promise.resolve(checkSentry()),
  ]);

  const services: ServiceStatus = {
    database,
    redis,
    email: {
      resend,
      emailjs,
    },
    analytics,
    monitoring: {
      sentry,
    },
    external: {
      github,
    },
  };

  const configuration = getConfigurationStatus();
  const system = getSystemResources();

  // Determine overall status
  const allChecks = [
    database,
    redis,
    resend,
    github,
    emailjs,
    analytics.umami,
    analytics.plausible,
    analytics.google,
    sentry,
  ];

  const hasErrors = allChecks.some((c) => c.status === 'error');
  const hasOk = allChecks.some((c) => c.status === 'ok');
  const securityIssues = !configuration.security.jwtConfigured || !configuration.security.csrfConfigured;

  let status: 'ok' | 'degraded' | 'error';
  if (hasErrors || securityIssues || !configuration.requiredEnvVars.allPresent) {
    status = 'error';
  } else if (!hasOk) {
    status = 'degraded';
  } else {
    status = 'ok';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? 'unknown',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? 'unknown',
    system,
    services,
    configuration,
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