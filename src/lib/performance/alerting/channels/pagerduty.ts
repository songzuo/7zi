/**
 * PagerDuty Alert Channel
 * Sends performance alerts to PagerDuty
 */

import type { PerformanceAlert } from '../alerter';

// ========================================
// Types
// ========================================

export interface PagerDutyConfig {
  /** PagerDuty integration key (routing key) */
  integrationKey: string;
  /** API endpoint (default: v2 events API) */
  apiEndpoint?: string;
}

export interface PagerDutyAlertOptions {
  /** Deduplication key (default: auto-generated) */
  deduplicationKey?: string;
  /** Event action (trigger, acknowledge, resolve) */
  action?: 'trigger' | 'acknowledge' | 'resolve';
  /** Severity (critical, error, warning, info) */
  severity?: 'critical' | 'error' | 'warning' | 'info';
  /** Event source */
  source?: string;
  /** Event component */
  component?: string;
  /** Event group */
  group?: string;
  /** Event class */
  eventClass?: string;
  /** Custom details */
  customDetails?: Record<string, unknown>;
  /** Include all metadata as custom details */
  includeMetadata?: boolean;
  /** Add links to alert details */
  addLinks?: boolean;
  /** Alert dashboard URL */
  dashboardUrl?: string;
}

type PagerDutyAction = 'trigger' | 'acknowledge' | 'resolve';

interface PagerDutyPayload {
  routing_key: string;
  deduplication_key: string;
  event_action: PagerDutyAction;
  payload: {
    summary: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    source: string;
    timestamp: string;
    component?: string;
    group?: string;
    class?: string;
    custom_details?: Record<string, unknown>;
  };
  client?: string;
  client_url?: string;
  links?: Array<{
    href: string;
    text: string;
  }>;
}

// ========================================
// PagerDutyChannel Class
// ========================================

export class PagerDutyChannel {
  name = 'pagerduty';
  private integrationKey: string;
  private apiEndpoint: string;
  private options: PagerDutyAlertOptions;

  constructor(config: PagerDutyConfig, options?: PagerDutyAlertOptions) {
    this.integrationKey = config.integrationKey;
    this.apiEndpoint = config.apiEndpoint || 'https://events.pagerduty.com/v2/enqueue';
    this.options = options || {};
  }

  /**
   * Send alert to PagerDuty
   */
  async send(alert: PerformanceAlert): Promise<void> {
    const payload = this.buildPagerDutyPayload(alert);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PagerDuty API failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      if (result.status === 'rate_limited') {
        console.warn('[PagerDutyChannel] Rate limited, message may be delayed');
      }

      console.log(`[PagerDutyChannel] Alert sent to PagerDuty: ${alert.id}`);
    } catch (error) {
      console.error('[PagerDutyChannel] Failed to send alert:', error);
      throw error;
    }
  }

  /**
   * Build PagerDuty payload
   */
  private buildPagerDutyPayload(alert: PerformanceAlert): PagerDutyPayload {
    const timestamp = new Date(alert.createdAt).toISOString();
    const deduplicationKey = this.options.deduplicationKey || this.generateDeduplicationKey(alert);
    const action = this.determineAction(alert);
    const severity = this.mapLevelToSeverity(alert.level);

    // Build custom details
    const customDetails: Record<string, unknown> = {
      ...this.options.customDetails,
      alert_id: alert.id,
      category: alert.category,
      status: alert.status,
      occurrence_count: alert.occurrenceCount,
    };

    // Add metric details
    if (alert.metric) {
      customDetails.metric = alert.metric;
      if (alert.currentValue !== undefined) {
        customDetails.current_value = alert.currentValue;
      }
      if (alert.threshold !== undefined) {
        customDetails.threshold = alert.threshold;
      }
    }

    // Add acknowledged info
    if (alert.acknowledgedBy) {
      customDetails.acknowledged_by = alert.acknowledgedBy;
      if (alert.acknowledgedAt) {
        customDetails.acknowledged_at = new Date(alert.acknowledgedAt).toISOString();
      }
    }

    // Add resolved info
    if (alert.resolvedAt) {
      customDetails.resolved_at = new Date(alert.resolvedAt).toISOString();
    }

    // Add metadata
    if (this.options.includeMetadata && alert.metadata) {
      Object.assign(customDetails, alert.metadata);
    }

    // Build payload
    const payload: PagerDutyPayload = {
      routing_key: this.integrationKey,
      deduplication_key: deduplicationKey,
      event_action: action,
      payload: {
        summary: `[${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`,
        severity,
        source: this.options.source || alert.source,
        timestamp,
        component: this.options.component || alert.source,
        group: this.options.group,
        class: this.options.eventClass || alert.category,
        custom_details: Object.keys(customDetails).length > 0 ? customDetails : undefined,
      },
      client: 'Performance Alerting System',
    };

    // Add dashboard link
    if (this.options.addLinks && this.options.dashboardUrl) {
      payload.client_url = this.options.dashboardUrl;
      payload.links = [{
        href: `${this.options.dashboardUrl}/alerts/${alert.id}`,
        text: 'View Alert',
      }];
    }

    return payload;
  }

  /**
   * Generate deduplication key for alert
   */
  private generateDeduplicationKey(alert: PerformanceAlert): string {
    const parts = [
      alert.title,
      alert.level,
      alert.category,
      alert.source,
      alert.metric || 'none',
    ];
    return parts.join('-').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Determine event action based on alert status
   */
  private determineAction(alert: PerformanceAlert): PagerDutyAction {
    // If user explicitly set action
    if (this.options.action) {
      return this.options.action;
    }

    // Auto-determine based on alert status
    if (alert.status === 'resolved') {
      return 'resolve';
    } else if (alert.status === 'acknowledged') {
      return 'acknowledge';
    } else {
      return 'trigger';
    }
  }

  /**
   * Map alert level to PagerDuty severity
   */
  private mapLevelToSeverity(level: string): 'critical' | 'error' | 'warning' | 'info' {
    const mapping: Record<string, 'critical' | 'error' | 'warning' | 'info'> = {
      critical: 'critical',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    return mapping[level] || 'warning';
  }

  /**
   * Test PagerDuty connectivity
   */
  async test(): Promise<boolean> {
    try {
      const testPayload: PagerDutyPayload = {
        routing_key: this.integrationKey,
        deduplication_key: 'test-alert-' + Date.now(),
        event_action: 'trigger',
        payload: {
          summary: 'PagerDuty integration test',
          severity: 'info',
          source: 'Performance Alerting System',
          timestamp: new Date().toISOString(),
          custom_details: {
            test: true,
            message: 'Your PagerDuty integration is working correctly.',
          },
        },
        client: 'Performance Alerting System',
      };

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        console.error('[PagerDutyChannel] Test failed:', response.status);
        return false;
      }

      const result = await response.json();
      return result.status === 'success' || result.status === 'rate_limited';
    } catch (error) {
      console.error('[PagerDutyChannel] Test error:', error);
      return false;
    }
  }

  /**
   * Update channel options
   */
  updateOptions(options: Partial<PagerDutyAlertOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): PagerDutyAlertOptions {
    return { ...this.options };
  }
}
