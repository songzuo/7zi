/**
 * Monitoring Module
 * System monitoring and metrics
 */

// ============================================================================
// Types
// ============================================================================

interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  timestamp: Date;
}

// ============================================================================
// In-memory storage
// ============================================================================

const metrics: Metric[] = [];
const healthChecks: HealthCheck[] = [];

// ============================================================================
// Metric Functions
// ============================================================================

/**
 * Record a metric
 */
export function recordMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
): void {
  const metric: Metric = {
    name,
    value,
    timestamp: new Date(),
    tags,
  };

  metrics.push(metric);

  // Keep only last 1000 metrics
  if (metrics.length > 1000) {
    metrics.shift();
  }
}

/**
 * Get metrics by name
 */
export function getMetrics(name: string, limit?: number): Metric[] {
  const filtered = metrics.filter((m) => m.name === name);

  if (limit) {
    return filtered.slice(-limit);
  }

  return filtered;
}

/**
 * Get all metrics
 */
export function getAllMetrics(limit?: number): Metric[] {
  if (limit) {
    return metrics.slice(-limit);
  }

  return [...metrics];
}

/**
 * Calculate metric statistics
 */
export function getMetricStats(name: string): {
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
} | null {
  const filtered = metrics.filter((m) => m.name === name);

  if (filtered.length === 0) {
    return null;
  }

  const values = filtered.map((m) => m.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    count: filtered.length,
    min,
    max,
    avg,
    sum,
  };
}

// ============================================================================
// Health Check Functions
// ============================================================================

/**
 * Record a health check
 */
export function recordHealthCheck(
  name: string,
  status: HealthCheck['status'],
  message?: string
): void {
  const healthCheck: HealthCheck = {
    name,
    status,
    message,
    timestamp: new Date(),
  };

  // Remove old health check for this name
  const index = healthChecks.findIndex((h) => h.name === name);
  if (index >= 0) {
    healthChecks.splice(index, 1);
  }

  healthChecks.push(healthCheck);
}

/**
 * Get health checks
 */
export function getHealthChecks(): HealthCheck[] {
  return [...healthChecks];
}

/**
 * Get health check by name
 */
export function getHealthCheck(name: string): HealthCheck | undefined {
  return healthChecks.find((h) => h.name === name);
}

/**
 * Check if system is healthy
 */
export function isHealthy(): boolean {
  return healthChecks.every((h) => h.status === 'healthy');
}

// ============================================================================
// System Monitoring
// ============================================================================

/**
 * Get system metrics
 */
export function getSystemMetrics(): {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    loadavg: number[];
  };
} {
  const memUsage = process.memoryUsage();
  const totalMem = memUsage.heapTotal;
  const usedMem = memUsage.heapUsed;

  return {
    uptime: process.uptime(),
    memory: {
      used: usedMem,
      total: totalMem,
      percentage: (usedMem / totalMem) * 100,
    },
    cpu: {
      loadavg: typeof (process as any).cpuLoadavg === 'function' ? (process as any).cpuLoadavg() : [0, 0, 0],
    },
  };
}

/**
 * Start monitoring loop
 */
export function startMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
  return setInterval(() => {
    const sysMetrics = getSystemMetrics();

    recordMetric('memory.used', sysMetrics.memory.used, { unit: 'bytes' });
    recordMetric('memory.percentage', sysMetrics.memory.percentage, { unit: 'percent' });
    recordMetric('uptime', sysMetrics.uptime, { unit: 'seconds' });

    // Record health check
    const isMemHealthy = sysMetrics.memory.percentage < 90;
    recordHealthCheck(
      'memory',
      isMemHealthy ? 'healthy' : 'degraded',
      `${sysMetrics.memory.percentage.toFixed(2)}% used`
    );
  }, intervalMs);
}

/**
 * Stop monitoring loop
 */
export function stopMonitoring(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
}

// ============================================================================
// Alert Rate Limiting & Deduplication
// ============================================================================

interface AlertState {
  lastFired: number;
  fireCount: number;
  isCoolingDown: boolean;
}

interface AlertConfig {
  cooldownMs: number;  // Minimum time between alerts of same type
  maxFiresPerWindow: number;  // Max fires per time window
  windowMs: number;  // Time window for max fire count
}

// In-memory alert state tracking
const alertStates: Map<string, AlertState> = new Map();
const alertConfigs: Map<string, AlertConfig> = new Map();

// Default alert config: 5 minute cooldown, max 3 fires per 15 minutes
const DEFAULT_ALERT_CONFIG: AlertConfig = {
  cooldownMs: 5 * 60 * 1000,  // 5 minutes
  maxFiresPerWindow: 3,
  windowMs: 15 * 60 * 1000,  // 15 minutes
};

/**
 * Configure alert settings for a specific alert type
 */
export function configureAlert(alertName: string, config: Partial<AlertConfig>): void {
  const existing = alertConfigs.get(alertName) || { ...DEFAULT_ALERT_CONFIG };
  alertConfigs.set(alertName, { ...existing, ...config });
}

/**
 * Check if alert should fire (rate limiting + deduplication)
 * Returns true if alert can fire, false if blocked by rate limit
 */
export function shouldFireAlert(alertName: string): boolean {
  const now = Date.now();
  const config = alertConfigs.get(alertName) || DEFAULT_ALERT_CONFIG;
  const state = alertStates.get(alertName);

  // No previous state - can fire
  if (!state) {
    alertStates.set(alertName, {
      lastFired: now,
      fireCount: 1,
      isCoolingDown: false,
    });
    return true;
  }

  // Check cooldown period
  if (now - state.lastFired < config.cooldownMs) {
    // Check if we should still record this attempt but not fire
    if (state.fireCount < config.maxFiresPerWindow) {
      state.fireCount++;
    }
    return false;
  }

  // Cooldown expired - can fire
  alertStates.set(alertName, {
    lastFired: now,
    fireCount: state.fireCount >= config.maxFiresPerWindow ? 1 : state.fireCount + 1,
    isCoolingDown: false,
  });
  return true;
}

/**
 * Get current alert state for monitoring
 */
export function getAlertState(alertName: string): AlertState | undefined {
  return alertStates.get(alertName);
}

/**
 * Reset alert state (for testing)
 */
export function resetAlertState(alertName?: string): void {
  if (alertName) {
    alertStates.delete(alertName);
  } else {
    alertStates.clear();
  }
}

/**
 * Fire an alert with rate limiting
 * Returns true if alert was fired, false if blocked
 */
export function fireAlert(
  alertName: string,
  alertData: { message: string; severity?: string; metadata?: Record<string, unknown> }
): boolean {
  if (!shouldFireAlert(alertName)) {
    return false;
  }

  // In production, this would integrate with notification systems
  // For now, just record the metric
  recordMetric(`alert.${alertName}`, 1, {
    severity: alertData.severity || 'info',
    message: alertData.message,
    ...alertData.metadata,
  });

  return true;
}

// ============================================================================
// Health Probes
// ============================================================================

interface HealthProbe {
  name: string;
  check: () => Promise<boolean> | boolean;
  timeout?: number;
}

interface ProbeResult {
  name: string;
  status: 'pass' | 'fail' | 'timeout';
  duration: number;
  message?: string;
}

const healthProbes: Map<string, HealthProbe> = new Map();

/**
 * Register a health probe
 */
export function registerProbe(probe: HealthProbe): void {
  healthProbes.set(probe.name, probe);
}

/**
 * Unregister a health probe
 */
export function unregisterProbe(name: string): void {
  healthProbes.delete(name);
}

/**
 * Run a specific probe
 */
export async function runProbe(name: string): Promise<ProbeResult> {
  const probe = healthProbes.get(name);

  if (!probe) {
    return {
      name,
      status: 'fail',
      duration: 0,
      message: 'Probe not found',
    };
  }

  const startTime = Date.now();

  try {
    const timeout = probe.timeout || 5000;

    const result = await Promise.race([
      probe.check(),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Probe timeout')), timeout)
      ),
    ]);

    const duration = Date.now() - startTime;

    return {
      name,
      status: result ? 'pass' : 'fail',
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      name,
      status: 'timeout',
      duration,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run all registered probes
 */
export async function runAllProbes(): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];

  for (const [name] of healthProbes) {
    const result = await runProbe(name);
    results.push(result);
  }

  return results;
}

/**
 * Export probes object for compatibility
 */
export const probes = {
  register: registerProbe,
  unregister: unregisterProbe,
  run: runProbe,
  runAll: runAllProbes,
};
