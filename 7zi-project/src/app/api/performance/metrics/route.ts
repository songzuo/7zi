/**
 * Performance Monitoring API
 * Enhanced API for comprehensive performance monitoring with alerting
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createSuccessResponse, createErrorResponse, createValidationError } from '@/lib/api/error-handler';
import { withUserAuth, type RBACUserContext } from '@/lib/auth/middleware-rbac';

// ========================================
// Types
// ========================================

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needsImprovement' | 'poor';
  timestamp: number;
  route: string;
  deviceType: string;
  connectionType: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
}

export interface PerformanceAlert {
  id: string;
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: AlertRule['severity'];
  timestamp: number;
  route: string;
  message: string;
  acknowledged: boolean;
}

// ========================================
// In-memory Storage (Production: use Database)
// ========================================

const performanceStore: Map<string, PerformanceMetric[]> = new Map();
const alertRules: AlertRule[] = [];
const activeAlerts: PerformanceAlert[] = [];

// Store up to 5000 metrics per route
const MAX_METRICS_PER_ROUTE = 5000;

// ========================================
// Default Alert Rules
// ========================================

const defaultAlertRules: AlertRule[] = [
  {
    id: 'lcp-poor',
    name: 'LCP > 4000ms (Poor)',
    metric: 'LCP',
    condition: 'gt',
    threshold: 4000,
    enabled: true,
    severity: 'critical',
    notificationChannels: ['console'],
  },
  {
    id: 'lcp-needs-improvement',
    name: 'LCP > 2500ms (Needs Improvement)',
    metric: 'LCP',
    condition: 'gt',
    threshold: 2500,
    enabled: true,
    severity: 'medium',
    notificationChannels: ['console'],
  },
  {
    id: 'fid-poor',
    name: 'FID > 300ms (Poor)',
    metric: 'FID',
    condition: 'gt',
    threshold: 300,
    enabled: true,
    severity: 'critical',
    notificationChannels: ['console'],
  },
  {
    id: 'cls-poor',
    name: 'CLS > 0.25 (Poor)',
    metric: 'CLS',
    condition: 'gt',
    threshold: 0.25,
    enabled: true,
    severity: 'high',
    notificationChannels: ['console'],
  },
  {
    id: 'inp-poor',
    name: 'INP > 500ms (Poor)',
    metric: 'INP',
    condition: 'gt',
    threshold: 500,
    enabled: true,
    severity: 'critical',
    notificationChannels: ['console'],
  },
  {
    id: 'ttfb-poor',
    name: 'TTFB > 1800ms (Poor)',
    metric: 'TTFB',
    condition: 'gt',
    threshold: 1800,
    enabled: true,
    severity: 'high',
    notificationChannels: ['console'],
  },
];

// Initialize default rules
alertRules.push(...defaultAlertRules);

// ========================================
// Alert Evaluation
// ========================================

function evaluateAlerts(metrics: PerformanceMetric[]): PerformanceAlert[] {
  const triggeredAlerts: PerformanceAlert[] = [];

  for (const rule of alertRules.filter(r => r.enabled)) {
    const metric = metrics.find(m => m.name === rule.metric);
    if (!metric) continue;

    let triggered = false;
    switch (rule.condition) {
      case 'gt':
        triggered = metric.value > rule.threshold;
        break;
      case 'lt':
        triggered = metric.value < rule.threshold;
        break;
      case 'eq':
        triggered = metric.value === rule.threshold;
        break;
    }

    if (triggered) {
      const alert: PerformanceAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        metric: metric.name,
        value: metric.value,
        threshold: rule.threshold,
        severity: rule.severity,
        timestamp: Date.now(),
        route: metric.route,
        message: `${rule.name}: ${metric.name} is ${metric.value.toFixed(2)} (threshold: ${rule.threshold}) on ${metric.route}`,
        acknowledged: false,
      };

      triggeredAlerts.push(alert);
      activeAlerts.push(alert);

      // Log the alert
      logger.warn('Performance alert triggered', {
        alertId: alert.id,
        ruleName: rule.name,
        metric: metric.name,
        value: metric.value,
        threshold: rule.threshold,
        severity: rule.severity,
        route: metric.route,
      });

      // Send notifications
      sendNotifications(alert, rule);
    }
  }

  return triggeredAlerts;
}

function sendNotifications(alert: PerformanceAlert, rule: AlertRule) {
  // Console notification
  if (rule.notificationChannels.includes('console')) {
    const emoji = {
      low: '⚠️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴',
    }[alert.severity];

    console.error(`${emoji} [Performance Alert] ${alert.message}`);
  }

  // Future: Add Slack, Discord, Email, Telegram notifications
  // if (rule.notificationChannels.includes('slack')) {
  //   await sendSlackAlert(alert);
  // }
  // if (rule.notificationChannels.includes('telegram')) {
  //   await sendTelegramAlert(alert);
  // }
}

// ========================================
// Statistics Calculation
// ========================================

export interface MetricStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  good: number;
  needsImprovement: number;
  poor: number;
}

function calculateMetricStats(metrics: PerformanceMetric[]): MetricStats {
  if (metrics.length === 0) {
    return {
      count: 0,
      avg: 0,
      min: 0,
      max: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      good: 0,
      needsImprovement: 0,
      poor: 0,
    };
  }

  const values = metrics.map(m => m.value).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);

  const ratingCounts = metrics.reduce((acc, m) => {
    acc[m.rating]++;
    return acc;
  }, { good: 0, needsImprovement: 0, poor: 0 });

  return {
    count: metrics.length,
    avg: sum / metrics.length,
    min: values[0],
    max: values[values.length - 1],
    p50: values[Math.floor(values.length * 0.5)],
    p90: values[Math.floor(values.length * 0.9)],
    p95: values[Math.floor(values.length * 0.95)],
    good: ratingCounts.good,
    needsImprovement: ratingCounts.needsImprovement,
    poor: ratingCounts.poor,
  };
}

// ========================================
// API Routes
// ========================================

/**
 * GET /api/performance/metrics
 * Retrieve performance metrics with filtering
 */
export async function GET(request: NextRequest) {
  return withUserAuth(request, async (req: NextRequest, userContext: RBACUserContext) => {
    const { searchParams } = new URL(req.url);
    const route = searchParams.get('route');
    const metric = searchParams.get('metric');
    const rating = searchParams.get('rating');
    const startTime = parseInt(searchParams.get('startTime') || '0');
    const endTime = parseInt(searchParams.get('endTime') || Date.now().toString());
    const limit = parseInt(searchParams.get('limit') || '100');

    let allMetrics: PerformanceMetric[] = [];

    if (route && performanceStore.has(route)) {
      allMetrics = performanceStore.get(route)!;
    } else {
      performanceStore.forEach(metrics => {
        allMetrics.push(...metrics);
      });
    }

    // Filter by metric name
    if (metric) {
      allMetrics = allMetrics.filter(m => m.name === metric);
    }

    // Filter by rating
    if (rating) {
      allMetrics = allMetrics.filter(m => m.rating === rating);
    }

    // Filter by time range
    allMetrics = allMetrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);

    // Sort by timestamp (newest first)
    allMetrics.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    allMetrics = allMetrics.slice(0, limit);

    // Calculate statistics
    const stats: Record<string, MetricStats> = {};
    const groupedByMetric = new Map<string, PerformanceMetric[]>();

    allMetrics.forEach(m => {
      if (!groupedByMetric.has(m.name)) {
        groupedByMetric.set(m.name, []);
      }
      groupedByMetric.get(m.name)!.push(m);
    });

    groupedByMetric.forEach((metrics, name) => {
      stats[name] = calculateMetricStats(metrics);
    });

    return createSuccessResponse({
      metrics: allMetrics,
      stats,
      totalAlerts: activeAlerts.filter(a => !a.acknowledged).length,
    });
  });
}

/**
 * POST /api/performance/metrics
 * Store new performance metrics
 */
export async function POST(request: NextRequest) {
  return withUserAuth(request, async (req: NextRequest, userContext: RBACUserContext) => {
    try {
      const body = await req.json();
      const { metrics, metadata } = body;

      if (!Array.isArray(metrics) || metrics.length === 0) {
        return createValidationError('Invalid metrics data');
      }

      const storedMetrics: PerformanceMetric[] = [];

      for (const metric of metrics) {
        const perfMetric: PerformanceMetric = {
          id: metric.id || `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          timestamp: metric.timestamp || Date.now(),
          route: metadata?.route || 'unknown',
          deviceType: metadata?.deviceType || 'unknown',
          connectionType: metadata?.connectionType || 'unknown',
        };

        const route = perfMetric.route;

        if (!performanceStore.has(route)) {
          performanceStore.set(route, []);
        }

        const routeMetrics = performanceStore.get(route)!;
        routeMetrics.push(perfMetric);

        // Prune old metrics
        if (routeMetrics.length > MAX_METRICS_PER_ROUTE) {
          routeMetrics.shift();
        }

        storedMetrics.push(perfMetric);

        // Log to existing logger
        logger.info('Performance metric recorded', {
          name: perfMetric.name,
          value: perfMetric.value,
          rating: perfMetric.rating,
          route: perfMetric.route,
          deviceType: perfMetric.deviceType,
        });
      }

      // Evaluate alerts
      const triggeredAlerts = evaluateAlerts(storedMetrics);

      return createSuccessResponse({
        stored: storedMetrics.length,
        alertsTriggered: triggeredAlerts.length,
        alerts: triggeredAlerts,
      });
    } catch (error) {
      logger.error('Failed to process performance metrics', error instanceof Error ? error : new Error(String(error)), { category: 'performance' });

      return createErrorResponse(error instanceof Error ? error : new Error('Failed to process metrics'));
    }
  });
}

/**
 * DELETE /api/performance/metrics
 * Clear old performance metrics
 */
export async function DELETE(request: NextRequest) {
  return withUserAuth(request, async (req: NextRequest, userContext: RBACUserContext) => {
    const { searchParams } = new URL(req.url);
    const beforeTimestamp = parseInt(searchParams.get('before') || '0');

    if (beforeTimestamp > 0) {
      let deletedCount = 0;

      performanceStore.forEach((metrics, route) => {
        const initialLength = metrics.length;
        const filtered = metrics.filter(m => m.timestamp >= beforeTimestamp);
        performanceStore.set(route, filtered);
        deletedCount += initialLength - filtered.length;
      });

      return createSuccessResponse({
        deleted: deletedCount,
        remainingMetrics: Array.from(performanceStore.values()).flat().length,
      });
    } else {
      // Clear all metrics (with confirmation check)
      const totalMetrics = Array.from(performanceStore.values()).flat().length;
      performanceStore.clear();

      return createSuccessResponse({
        deleted: totalMetrics,
        remainingMetrics: 0,
      });
    }
  });
}
