/**
 * Alert Manager - v1.10.0
 * 日志告警管理器实现
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import type {
  IAlertManager,
  AlertRuleConfig,
  AlertInstance,
  AlertCondition,
  AlertSeverity,
  AlertStatus,
  AlertHistoryQuery,
  ILogStorage,
  LogEntry,
  LogQuery,
  TimeRange,
  LogEvent,
  LogEventListener,
} from '../types.js';

/**
 * 告警管理器
 */
export class AlertManager extends EventEmitter implements IAlertManager {
  private _rules: Map<string, AlertRuleConfig> = new Map();
  private _activeAlerts: Map<string, AlertInstance> = new Map();
  private _alertHistory: AlertInstance[] = [];
  private _storage: ILogStorage;
  private _throttleState: Map<string, { count: number; lastReset: number }> = new Map();
  private _listeners: LogEventListener[] = [];
  private _evaluationTimer?: NodeJS.Timeout;

  constructor(storage: ILogStorage) {
    super();
    this._storage = storage;
    this.setMaxListeners(100);
  }

  /**
   * 添加告警规则
   */
  async addRule(rule: AlertRuleConfig): Promise<void> {
    this._rules.set(rule.id, rule);
    this.emit('rule:added', rule);
  }

  /**
   * 更新告警规则
   */
  async updateRule(rule: AlertRuleConfig): Promise<void> {
    this._rules.set(rule.id, rule);
    this.emit('rule:updated', rule);
  }

  /**
   * 移除告警规则
   */
  async removeRule(ruleId: string): Promise<void> {
    const rule = this._rules.get(ruleId);
    if (rule) {
      this._rules.delete(ruleId);
      this.emit('rule:removed', rule);
    }
  }

  /**
   * 获取所有规则
   */
  async getRules(): Promise<AlertRuleConfig[]> {
    return Array.from(this._rules.values());
  }

  /**
   * 评估日志并触发告警
   */
  async evaluate(logs: LogEntry[]): Promise<AlertInstance[]> {
    const triggeredAlerts: AlertInstance[] = [];

    for (const rule of Array.from(this._rules.values())) {
      if (!rule.enabled) {
        continue;
      }

      // Check throttle
      if (this.isThrottled(rule)) {
        continue;
      }

      // Evaluate condition
      const result = await this.evaluateCondition(rule.condition, logs);

      if (result.triggered) {
        const alert = await this.createAlert(rule, logs, result.context);
        if (alert) {
          triggeredAlerts.push(alert);
          this.updateThrottle(rule);
          
          // Execute actions
          await this.executeActions(rule, alert);
        }
      }
    }

    // Emit events
    for (const alert of triggeredAlerts) {
      await this.emitEvent({
        type: 'alert_triggered',
        alertId: alert.id,
        severity: alert.severity,
      });
    }

    return triggeredAlerts;
  }

  /**
   * 获取活动告警
   */
  async getActiveAlerts(): Promise<AlertInstance[]> {
    return Array.from(this._activeAlerts.values())
      .filter((alert) => alert.status === 'active');
  }

  /**
   * 确认告警
   */
  async acknowledge(alertId: string, user: string): Promise<void> {
    const alert = this._activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = user;
    alert.acknowledgedAt = new Date();
    alert.history.push({
      timestamp: new Date(),
      action: 'acknowledged',
      user,
      details: `Acknowledged by ${user}`,
    });

    this.emit('alert:acknowledged', alert);
  }

  /**
   * 解决告警
   */
  async resolve(alertId: string, user: string): Promise<void> {
    const alert = this._activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'resolved';
    alert.endTime = new Date();
    alert.history.push({
      timestamp: new Date(),
      action: 'resolved',
      user,
      details: `Resolved by ${user}`,
    });

    // Move to history
    this._alertHistory.push(alert);
    this._activeAlerts.delete(alertId);

    this.emit('alert:resolved', alert);
  }

  /**
   * 获取告警历史
   */
  async getAlertHistory(query: AlertHistoryQuery): Promise<AlertInstance[]> {
    let alerts = [...this._alertHistory];

    // Filter by time range
    if (query.timeRange) {
      alerts = alerts.filter(
        (alert) =>
          alert.startTime >= query.timeRange!.start &&
          alert.startTime <= query.timeRange!.end
      );
    }

    // Filter by severity
    if (query.severity && query.severity.length > 0) {
      alerts = alerts.filter((alert) => query.severity!.includes(alert.severity));
    }

    // Filter by status
    if (query.status && query.status.length > 0) {
      alerts = alerts.filter((alert) => query.status!.includes(alert.status));
    }

    // Filter by rule
    if (query.ruleId) {
      alerts = alerts.filter((alert) => alert.ruleId === query.ruleId);
    }

    // Sort by start time (most recent first)
    alerts.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Apply limit
    if (query.limit) {
      alerts = alerts.slice(0, query.limit);
    }

    return alerts;
  }

  /**
   * 启动定期评估
   */
  startPeriodicEvaluation(intervalMs: number = 60000): void {
    this._evaluationTimer = setInterval(async () => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - intervalMs);
        
        const query: LogQuery = {
          timeRange: { start: startTime, end: endTime },
        };
        
        const result = await this._storage.query(query);
        await this.evaluate(result.entries);
      } catch (error) {
        console.error('Error in periodic alert evaluation:', error);
      }
    }, intervalMs);
  }

  /**
   * 停止定期评估
   */
  stopPeriodicEvaluation(): void {
    if (this._evaluationTimer) {
      clearInterval(this._evaluationTimer);
      this._evaluationTimer = undefined;
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: LogEventListener): void {
    this._listeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: LogEventListener): void {
    const index = this._listeners.indexOf(listener);
    if (index > -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  private async emitEvent(event: LogEvent): Promise<void> {
    for (const listener of this._listeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error(`Error in event listener:`, error);
      }
    }
  }

  /**
   * 检查是否节流
   */
  private isThrottled(rule: AlertRuleConfig): boolean {
    if (!rule.throttle.enabled) {
      return false;
    }

    const state = this._throttleState.get(rule.id);
    if (!state) {
      return false;
    }

    const now = Date.now();
    if (now - state.lastReset > rule.throttle.period * 1000) {
      this._throttleState.delete(rule.id);
      return false;
    }

    return state.count >= rule.throttle.maxAlerts;
  }

  /**
   * 更新节流状态
   */
  private updateThrottle(rule: AlertRuleConfig): void {
    if (!rule.throttle.enabled) {
      return;
    }

    const now = Date.now();
    const state = this._throttleState.get(rule.id);

    if (!state || now - state.lastReset > rule.throttle.period * 1000) {
      this._throttleState.set(rule.id, { count: 1, lastReset: now });
    } else {
      state.count++;
    }
  }

  /**
   * 评估条件
   */
  private async evaluateCondition(
    condition: AlertCondition,
    logs: LogEntry[]
  ): Promise<{ triggered: boolean; context: Record<string, unknown> }> {
    const context: Record<string, unknown> = {};

    switch (condition.type) {
      case 'threshold':
        return this.evaluateThresholdCondition(condition, logs, context);
      case 'rate':
        return this.evaluateRateCondition(condition, logs, context);
      case 'absence':
        return this.evaluateAbsenceCondition(condition, logs, context);
      case 'pattern':
        return this.evaluatePatternCondition(condition, logs, context);
      case 'ml':
        return this.evaluateMLCondition(condition, logs, context);
      default:
        return { triggered: false, context };
    }
  }

  /**
   * 评估阈值条件
   */
  private evaluateThresholdCondition(
    condition: AlertCondition,
    logs: LogEntry[],
    context: Record<string, unknown>
  ): { triggered: boolean; context: Record<string, unknown> } {
    const matchingLogs = logs.filter((log) => {
      const value = this.getFieldValue(log, condition.field);
      if (typeof value === 'number') {
        return this.compareValue(value, condition.operator, condition.value);
      }
      return false;
    });

    const count = matchingLogs.length;
    context.matchingCount = count;
    context.threshold = condition.value;
    context.operator = condition.operator;

    const triggered = count >= (condition.minOccurrences || 1) &&
      this.compareValue(count, condition.operator, condition.value);

    return { triggered, context };
  }

  /**
   * 评估速率条件
   */
  private evaluateRateCondition(
    condition: AlertCondition,
    logs: LogEntry[],
    context: Record<string, unknown>
  ): { triggered: boolean; context: Record<string, unknown> } {
    // Calculate rate per minute
    const now = Date.now();
    const windowStart = now - condition.timeWindow * 1000;
    
    const recentLogs = logs.filter(
      (log) => log.timestamp.getTime() >= windowStart
    );

    const matchingLogs = recentLogs.filter((log) => {
      const value = this.getFieldValue(log, condition.field);
      return this.compareValue(value, condition.operator, condition.value);
    });

    const rate = matchingLogs.length / (condition.timeWindow / 60);
    context.rate = rate;
    context.matchingCount = matchingLogs.length;
    context.timeWindow = condition.timeWindow;

    const triggered = this.compareValue(rate, condition.operator, condition.value);

    return { triggered, context };
  }

  /**
   * 评估缺失条件
   */
  private async evaluateAbsenceCondition(
    condition: AlertCondition,
    logs: LogEntry[],
    context: Record<string, unknown>
  ): Promise<{ triggered: boolean; context: Record<string, unknown> }> {
    const query: LogQuery = condition.query || {
      timeRange: {
        start: new Date(Date.now() - condition.timeWindow * 1000),
        end: new Date(),
      },
    };

    const result = await this._storage.query(query);
    const count = result.total;

    context.logCount = count;
    context.timeWindow = condition.timeWindow;

    const targetValue = typeof condition.value === 'number' ? condition.value : 0;
    const triggered = count < targetValue;

    return { triggered, context };
  }

  /**
   * 评估模式条件
   */
  private evaluatePatternCondition(
    condition: AlertCondition,
    logs: LogEntry[],
    context: Record<string, unknown>
  ): { triggered: boolean; context: Record<string, unknown> } {
    if (!condition.query?.textQuery) {
      return { triggered: false, context };
    }

    const pattern = condition.query.textQuery;
    const regex = new RegExp(pattern, 'gi');

    const matchingLogs = logs.filter((log) => {
      const value = this.getFieldValue(log, condition.field);
      if (typeof value === 'string') {
        return regex.test(value);
      }
      return false;
    });

    const count = matchingLogs.length;
    context.matchingCount = count;
    context.pattern = pattern;

    const triggered = count >= (condition.minOccurrences || 1);

    return { triggered, context };
  }

  /**
   * 评估 ML 条件（简化实现）
   */
  private evaluateMLCondition(
    condition: AlertCondition,
    logs: LogEntry[],
    context: Record<string, unknown>
  ): { triggered: boolean; context: Record<string, unknown> } {
    // Simplified ML-based condition
    // In a real implementation, this would use the ML model
    return { triggered: false, context };
  }

  /**
   * 比较值
   */
  private compareValue(
    value: unknown,
    operator: AlertCondition['operator'],
    target: unknown
  ): boolean {
    if (typeof value !== 'number' || typeof target !== 'number') {
      if (operator === 'eq' || operator === 'neq') {
        // Allow non-number comparison for eq/neq
        if (operator === 'eq') return value === target;
        return value !== target;
      }
      return false;
    }

    switch (operator) {
      case 'gt':
        return value > target;
      case 'gte':
        return value >= target;
      case 'lt':
        return value < target;
      case 'lte':
        return value <= target;
      case 'eq':
        return value === target;
      case 'neq':
        return value !== target;
      default:
        return false;
    }
  }

  /**
   * 获取字段值
   */
  private getFieldValue(entry: LogEntry, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = entry;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 创建告警
   */
  private async createAlert(
    rule: AlertRuleConfig,
    logs: LogEntry[],
    context: Record<string, unknown>
  ): Promise<AlertInstance | null> {
    // Check if similar alert already exists
    const existingAlert = this.findSimilarAlert(rule.id, context);
    if (existingAlert) {
      // Update existing alert
      existingAlert.occurrences++;
      existingAlert.lastOccurrence = new Date();
      existingAlert.relatedLogs.push(...logs.slice(0, 10).map((l) => l.id));
      return null;
    }

    const id = createHash('sha256')
      .update(`${rule.id}-${Date.now()}`)
      .digest('hex')
      .substring(0, 16);

    const alert: AlertInstance = {
      id,
      ruleId: rule.id,
      status: 'active',
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, context),
      startTime: new Date(),
      occurrences: 1,
      lastOccurrence: new Date(),
      context,
      relatedLogs: logs.slice(0, 10).map((l) => l.id),
      history: [
        {
          timestamp: new Date(),
          action: 'created',
          details: 'Alert triggered',
        },
      ],
    };

    this._activeAlerts.set(id, alert);
    this.emit('alert:created', alert);

    return alert;
  }

  /**
   * 查找相似告警
   */
  private findSimilarAlert(ruleId: string, context: Record<string, unknown>): AlertInstance | null {
    for (const alert of Array.from(this._activeAlerts.values())) {
      if (alert.ruleId === ruleId && alert.status === 'active') {
        // Simple similarity check based on context
        const similarity = this.calculateContextSimilarity(alert.context, context);
        if (similarity > 0.7) {
          return alert;
        }
      }
    }
    return null;
  }

  /**
   * 计算上下文相似度
   */
  private calculateContextSimilarity(
    context1: Record<string, unknown>,
    context2: Record<string, unknown>
  ): number {
    const keys1 = Object.keys(context1);
    const keys2 = Object.keys(context2);
    
    const commonKeys = keys1.filter((k) => keys2.includes(k));
    if (commonKeys.length === 0) {
      return 0;
    }

    let matches = 0;
    for (const key of commonKeys) {
      if (JSON.stringify(context1[key]) === JSON.stringify(context2[key])) {
        matches++;
      }
    }

    return matches / commonKeys.length;
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(
    rule: AlertRuleConfig,
    context: Record<string, unknown>
  ): string {
    const condition = rule.condition;
    let message = `Alert "${rule.name}" triggered: `;

    switch (condition.type) {
      case 'threshold':
        message += `${condition.field} ${condition.operator} ${condition.value} (current: ${context.matchingCount})`;
        break;
      case 'rate':
        message += `Rate of ${condition.field} exceeded threshold (${context.rate}/min)`;
        break;
      case 'absence':
        message += `No logs found in the last ${condition.timeWindow} seconds`;
        break;
      case 'pattern':
        message += `Pattern "${context.pattern}" matched ${context.matchingCount} times`;
        break;
      case 'ml':
        message += `ML-based anomaly detected`;
        break;
      default:
        message += `Condition met`;
    }

    return message;
  }

  /**
   * 执行告警动作
   */
  private async executeActions(rule: AlertRuleConfig, alert: AlertInstance): Promise<void> {
    for (const action of rule.actions) {
      try {
        await this.executeAction(action, alert);
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  /**
   * 执行单个动作
   */
  private async executeAction(
    action: AlertRuleConfig['actions'][0],
    alert: AlertInstance
  ): Promise<void> {
    switch (action.type) {
      case 'email':
        await this.sendEmail(alert, action.config);
        break;
      case 'webhook':
        await this.callWebhook(alert, action.config);
        break;
      case 'slack':
        await this.sendSlackMessage(alert, action.config);
        break;
      case 'pagerduty':
        await this.triggerPagerDuty(alert, action.config);
        break;
      case 'sms':
        await this.sendSMS(alert, action.config);
        break;
      case 'log':
        console.log(`ALERT: ${alert.title} - ${alert.message}`);
        break;
    }
  }

  /**
   * 发送邮件
   */
  private async sendEmail(
    alert: AlertInstance,
    config: Record<string, unknown>
  ): Promise<void> {
    // Implementation would use email service
    console.log(`Sending email alert: ${alert.title} to ${config.recipients}`);
  }

  /**
   * 调用 Webhook
   */
  private async callWebhook(
    alert: AlertInstance,
    config: Record<string, unknown>
  ): Promise<void> {
    const response = await fetch(config.url as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers as Record<string, string> || {}),
      },
      body: JSON.stringify({
        alert: {
          id: alert.id,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          status: alert.status,
          timestamp: alert.startTime,
          context: alert.context,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }

  /**
   * 发送 Slack 消息
   */
  private async sendSlackMessage(
    alert: AlertInstance,
    config: Record<string, unknown>
  ): Promise<void> {
    const webhookUrl = config.webhookUrl as string;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 ${alert.title}`,
        attachments: [
          {
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            fields: [
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Status', value: alert.status, short: true },
              { title: 'Message', value: alert.message, short: false },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }
  }

  /**
   * 触发 PagerDuty
   */
  private async triggerPagerDuty(
    alert: AlertInstance,
    config: Record<string, unknown>
  ): Promise<void> {
    // Implementation would use PagerDuty API
    console.log(`Triggering PagerDuty alert: ${alert.title}`);
  }

  /**
   * 发送短信
   */
  private async sendSMS(
    alert: AlertInstance,
    config: Record<string, unknown>
  ): Promise<void> {
    // Implementation would use SMS service
    console.log(`Sending SMS alert: ${alert.title} to ${config.phoneNumbers}`);
  }
}
