/**
 * Monitoring Storage
 * 监控数据存储
 */

import { PerformanceMetric, AlarmEvent } from './types';

export interface MonitoringStorage {
  saveMetric(metric: PerformanceMetric): Promise<void>;
  getMetrics(filter?: {
    type?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<PerformanceMetric[]>;
  getMetricsByTimeRange(startTime: number, endTime: number): Promise<PerformanceMetric[]>;
  clearMetrics(): Promise<void>;
  getMetricsCount(): Promise<number>;
  saveAlarm(event: AlarmEvent): Promise<void>;
  getAlarms(startTime?: number): Promise<AlarmEvent[]>;
  clearAlarms(): Promise<void>;
}

export class MemoryStorage implements MonitoringStorage {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private alarms: Map<string, AlarmEvent> = new Map();
  private retentionPeriodMs: number;

  constructor(retentionPeriodMs: number = 24 * 60 * 60 * 1000) {
    this.retentionPeriodMs = retentionPeriodMs;
  }

  async saveMetric(metric: PerformanceMetric): Promise<void> {
    // 清理过期数据
    await this.cleanupExpired();

    this.metrics.set(metric.id, metric);
  }

  async getMetrics(filter?: {
    type?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<PerformanceMetric[]> {
    let metrics = Array.from(this.metrics.values());

    if (filter?.type) {
      metrics = metrics.filter((m) => m.type === filter.type);
    }

    if (filter?.startTime) {
      metrics = metrics.filter((m) => m.timestamp >= filter.startTime!);
    }

    if (filter?.endTime) {
      metrics = metrics.filter((m) => m.timestamp <= filter.endTime!);
    }

    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getMetricsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<PerformanceMetric[]> {
    return this.getMetrics({ startTime, endTime });
  }

  async clearMetrics(): Promise<void> {
    this.metrics.clear();
  }

  async getMetricsCount(): Promise<number> {
    return this.metrics.size;
  }

  async saveAlarm(event: AlarmEvent): Promise<void> {
    this.alarms.set(event.id, event);
  }

  async getAlarms(startTime?: number): Promise<AlarmEvent[]> {
    let alarms = Array.from(this.alarms.values());

    if (startTime) {
      alarms = alarms.filter((a) => a.timestamp >= startTime);
    }

    return alarms.sort((a, b) => b.timestamp - a.timestamp);
  }

  async clearAlarms(): Promise<void> {
    this.alarms.clear();
  }

  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const cutoffTime = now - this.retentionPeriodMs;

    for (const [id, metric] of this.metrics) {
      if (metric.timestamp < cutoffTime) {
        this.metrics.delete(id);
      }
    }
  }
}

export class LocalStorageStorage implements MonitoringStorage {
  private retentionPeriodMs: number;
  private metricsKey = 'monitoring_metrics';
  private alarmsKey = 'monitoring_alarms';

  constructor(retentionPeriodMs: number = 24 * 60 * 60 * 1000) {
    this.retentionPeriodMs = retentionPeriodMs;
  }

  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  private getAllMetrics(): PerformanceMetric[] {
    if (!this.isClient()) return [];
    const data = localStorage.getItem(this.metricsKey);
    return data ? JSON.parse(data) : [];
  }

  private setAllMetrics(metrics: PerformanceMetric[]): void {
    if (!this.isClient()) return;
    localStorage.setItem(this.metricsKey, JSON.stringify(metrics));
  }

  private getAllAlarms(): AlarmEvent[] {
    if (!this.isClient()) return [];
    const data = localStorage.getItem(this.alarmsKey);
    return data ? JSON.parse(data) : [];
  }

  private setAllAlarms(alarms: AlarmEvent[]): void {
    if (!this.isClient()) return;
    localStorage.setItem(this.alarmsKey, JSON.stringify(alarms));
  }

  async saveMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.isClient()) return;

    const metrics = this.getAllMetrics();
    const existingIndex = metrics.findIndex((m) => m.id === metric.id);

    if (existingIndex >= 0) {
      metrics[existingIndex] = metric;
    } else {
      metrics.push(metric);
    }

    // 清理过期数据
    const now = Date.now();
    const cutoffTime = now - this.retentionPeriodMs;
    const filteredMetrics = metrics.filter((m) => m.timestamp >= cutoffTime);

    this.setAllMetrics(filteredMetrics);
  }

  async getMetrics(filter?: {
    type?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<PerformanceMetric[]> {
    if (!this.isClient()) return [];

    let metrics = this.getAllMetrics();

    if (filter?.type) {
      metrics = metrics.filter((m) => m.type === filter.type);
    }

    if (filter?.startTime) {
      metrics = metrics.filter((m) => m.timestamp >= filter.startTime!);
    }

    if (filter?.endTime) {
      metrics = metrics.filter((m) => m.timestamp <= filter.endTime!);
    }

    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getMetricsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<PerformanceMetric[]> {
    return this.getMetrics({ startTime, endTime });
  }

  async clearMetrics(): Promise<void> {
    if (!this.isClient()) return;
    localStorage.removeItem(this.metricsKey);
  }

  async getMetricsCount(): Promise<number> {
    if (!this.isClient()) return 0;
    return this.getAllMetrics().length;
  }

  async saveAlarm(event: AlarmEvent): Promise<void> {
    if (!this.isClient()) return;

    const alarms = this.getAllAlarms();
    const existingIndex = alarms.findIndex((a) => a.id === event.id);

    if (existingIndex >= 0) {
      alarms[existingIndex] = event;
    } else {
      alarms.push(event);
    }

    this.setAllAlarms(alarms);
  }

  async getAlarms(startTime?: number): Promise<AlarmEvent[]> {
    if (!this.isClient()) return [];

    let alarms = this.getAllAlarms();

    if (startTime) {
      alarms = alarms.filter((a) => a.timestamp >= startTime);
    }

    return alarms.sort((a, b) => b.timestamp - a.timestamp);
  }

  async clearAlarms(): Promise<void> {
    if (!this.isClient()) return;
    localStorage.removeItem(this.alarmsKey);
  }
}
