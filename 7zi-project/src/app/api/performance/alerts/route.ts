/**
 * Performance Alerts API
 * Manage performance alert rules and active alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import type { AlertRule, PerformanceAlert } from '../metrics/route';

// ========================================
// In-memory Storage (Production: use Database)
// ========================================

// These are shared with the metrics API via a singleton pattern
// In production, use a database
const alertRules: AlertRule[] = [
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
    id: 'fid-needs-improvement',
    name: 'FID > 100ms (Needs Improvement)',
    metric: 'FID',
    condition: 'gt',
    threshold: 100,
    enabled: true,
    severity: 'medium',
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
    id: 'cls-needs-improvement',
    name: 'CLS > 0.1 (Needs Improvement)',
    metric: 'CLS',
    condition: 'gt',
    threshold: 0.1,
    enabled: true,
    severity: 'medium',
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
    id: 'inp-needs-improvement',
    name: 'INP > 200ms (Needs Improvement)',
    metric: 'INP',
    condition: 'gt',
    threshold: 200,
    enabled: true,
    severity: 'medium',
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
  {
    id: 'ttfb-needs-improvement',
    name: 'TTFB > 800ms (Needs Improvement)',
    metric: 'TTFB',
    condition: 'gt',
    threshold: 800,
    enabled: true,
    severity: 'medium',
    notificationChannels: ['console'],
  },
];

let activeAlerts: PerformanceAlert[] = [];

// ========================================
// Helper Functions
// ========================================

function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ========================================
// API Routes
// ========================================

/**
 * GET /api/performance/alerts
 * Retrieve active alerts and alert rules
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showAcknowledged = searchParams.get('showAcknowledged') === 'true';
  const severity = searchParams.get('severity');
  const metric = searchParams.get('metric');
  const limit = parseInt(searchParams.get('limit') || '50');

  // Filter alerts
  let filteredAlerts = activeAlerts;

  if (!showAcknowledged) {
    filteredAlerts = filteredAlerts.filter(a => !a.acknowledged);
  }

  if (severity) {
    filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
  }

  if (metric) {
    filteredAlerts = filteredAlerts.filter(a => a.metric === metric);
  }

  // Sort by timestamp (newest first)
  filteredAlerts.sort((a, b) => b.timestamp - a.timestamp);

  // Limit results
  const alerts = filteredAlerts.slice(0, limit);

  // Calculate summary
  const summary = {
    total: activeAlerts.length,
    unacknowledged: activeAlerts.filter(a => !a.acknowledged).length,
    bySeverity: {
      low: activeAlerts.filter(a => a.severity === 'low' && !a.acknowledged).length,
      medium: activeAlerts.filter(a => a.severity === 'medium' && !a.acknowledged).length,
      high: activeAlerts.filter(a => a.severity === 'high' && !a.acknowledged).length,
      critical: activeAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
    },
    byMetric: {
      LCP: activeAlerts.filter(a => a.metric === 'LCP' && !a.acknowledged).length,
      FID: activeAlerts.filter(a => a.metric === 'FID' && !a.acknowledged).length,
      CLS: activeAlerts.filter(a => a.metric === 'CLS' && !a.acknowledged).length,
      INP: activeAlerts.filter(a => a.metric === 'INP' && !a.acknowledged).length,
      TTFB: activeAlerts.filter(a => a.metric === 'TTFB' && !a.acknowledged).length,
    },
  };

  return NextResponse.json({
    success: true,
    alerts,
    rules: alertRules,
    summary,
  });
}

/**
 * POST /api/performance/alerts
 * Create new alert rule or acknowledge alert
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, rule, alertId } = body;

    // Create new alert rule
    if (action === 'create-rule') {
      if (!rule || !rule.name || !rule.metric || !rule.condition || !rule.threshold) {
        return NextResponse.json(
          { error: 'Invalid rule data. Required: name, metric, condition, threshold' },
          { status: 400 }
        );
      }

      const newRule: AlertRule = {
        id: generateRuleId(),
        name: rule.name,
        metric: rule.metric,
        condition: rule.condition,
        threshold: rule.threshold,
        enabled: rule.enabled !== undefined ? rule.enabled : true,
        severity: rule.severity || 'medium',
        notificationChannels: rule.notificationChannels || ['console'],
      };

      alertRules.push(newRule);

      logger.info('Performance alert rule created', {
        ruleId: newRule.id,
        ruleName: newRule.name,
        metric: newRule.metric,
        threshold: newRule.threshold,
      });

      return NextResponse.json({
        success: true,
        rule: newRule,
      });
    }

    // Acknowledge alert
    if (action === 'acknowledge') {
      if (!alertId) {
        return NextResponse.json(
          { error: 'alertId is required' },
          { status: 400 }
        );
      }

      const alert = activeAlerts.find(a => a.id === alertId);
      if (!alert) {
        return NextResponse.json(
          { error: 'Alert not found' },
          { status: 404 }
        );
      }

      alert.acknowledged = true;

      logger.info('Performance alert acknowledged', {
        alertId: alert.id,
        metric: alert.metric,
        severity: alert.severity,
      });

      return NextResponse.json({
        success: true,
        alert,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: create-rule or acknowledge' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Failed to process alerts request', { error });

    return NextResponse.json(
      { error: 'Failed to process request', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/performance/alerts
 * Update existing alert rule
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleId, updates } = body;

    if (!ruleId || !updates) {
      return NextResponse.json(
        { error: 'ruleId and updates are required' },
        { status: 400 }
      );
    }

    const ruleIndex = alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    // Update rule
    alertRules[ruleIndex] = {
      ...alertRules[ruleIndex],
      ...updates,
      // Don't allow changing the ID
      id: alertRules[ruleIndex].id,
    };

    logger.info('Performance alert rule updated', {
      ruleId,
      updates,
    });

    return NextResponse.json({
      success: true,
      rule: alertRules[ruleIndex],
    });
  } catch (error) {
    logger.error('Failed to update alert rule', { error });

    return NextResponse.json(
      { error: 'Failed to update rule', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/performance/alerts
 * Delete alert rule or clear acknowledged alerts
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ruleId = searchParams.get('ruleId');
  const clearAcknowledged = searchParams.get('clearAcknowledged') === 'true';

  // Delete specific rule
  if (ruleId) {
    const ruleIndex = alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    const deletedRule = alertRules.splice(ruleIndex, 1)[0];

    logger.info('Performance alert rule deleted', {
      ruleId: deletedRule.id,
      ruleName: deletedRule.name,
    });

    return NextResponse.json({
      success: true,
      deleted: deletedRule,
    });
  }

  // Clear acknowledged alerts
  if (clearAcknowledged) {
    const initialLength = activeAlerts.length;
    activeAlerts = activeAlerts.filter(a => !a.acknowledged);

    const deletedCount = initialLength - activeAlerts.length;

    logger.info('Acknowledged alerts cleared', {
      deleted: deletedCount,
    });

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      remaining: activeAlerts.length,
    });
  }

  return NextResponse.json(
    { error: 'Specify ruleId or clearAcknowledged=true' },
    { status: 400 }
  );
}

// ========================================
// Export for use by metrics API
// ========================================

export { alertRules, activeAlerts };
