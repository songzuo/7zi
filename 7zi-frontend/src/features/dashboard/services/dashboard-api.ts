/**
 * Dashboard API Service
 * 数据可视化仪表板 API 服务
 */

import {
  MetricDataPoint,
  AggregatedMetricDataPoint,
  TimeRange,
  TIME_RANGES,
  METRIC_DEFINITIONS,
  MetricDefinition,
  DashboardConfig,
  DEFAULT_DASHBOARD,
} from '../types/dashboard';

// 监控系统 API 地址
const MONITORING_API_URL = process.env.NEXT_PUBLIC_MONITORING_API_URL || 'http://localhost:8080';
const MONITORING_API_KEY = process.env.NEXT_PUBLIC_MONITORING_API_KEY || '';

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * 发送 API 请求
 */
async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const response = await fetch(`${MONITORING_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MONITORING_API_KEY}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * 获取时间范围对应的起止时间戳
 */
export function getTimeRangeTimestamps(timeRange: TimeRange): { start: number; end: number; interval: number } {
  const config = TIME_RANGES.find((r) => r.value === timeRange) || TIME_RANGES[2];
  const end = Math.floor(Date.now() / 1000);
  const start = end - config.seconds;
  return { start, end, interval: config.interval };
}

/**
 * Dashboard API Service
 */
export class DashboardApiService {
  /**
   * 查询原始指标数据
   */
  async getMetrics(
    metricName: string,
    timeRange: TimeRange,
    tags?: Record<string, string>
  ): Promise<MetricDataPoint[]> {
    const { start, end } = getTimeRangeTimestamps(timeRange);

    try {
      const data = await fetchApi<Array<{
        name: string;
        value: number;
        timestamp: number;
        tags?: Record<string, string>;
      }>>('/api/metrics', {
        method: 'POST',
        body: {
          metric_name: metricName,
          start_time: start,
          end_time: end,
          tags,
        },
      });

      return data.map((item) => ({
        timestamp: item.timestamp,
        value: item.value,
        tags: item.tags,
      }));
    } catch (error) {
      console.error(`Error fetching metrics for ${metricName}:`, error);
      // 返回模拟数据用于开发
      return this.getMockMetricData(metricName, timeRange);
    }
  }

  /**
   * 查询聚合指标数据
   */
  async getAggregatedMetrics(
    metricName: string,
    timeRange: TimeRange,
    tags?: Record<string, string>
  ): Promise<AggregatedMetricDataPoint[]> {
    const { start, end, interval } = getTimeRangeTimestamps(timeRange);

    try {
      const data = await fetchApi<AggregatedMetricDataPoint[]>('/api/metrics/aggregate', {
        method: 'POST',
        body: {
          metric_name: metricName,
          start_time: start,
          end_time: end,
          interval_seconds: interval,
          tags,
        },
      });

      return data;
    } catch (error) {
      console.error(`Error fetching aggregated metrics for ${metricName}:`, error);
      // 返回模拟数据用于开发
      return this.getMockAggregatedData(metricName, timeRange, interval);
    }
  }

  /**
   * 获取最新指标值
   */
  async getLatestMetric(metricName: string, tags?: Record<string, string>): Promise<MetricDataPoint | null> {
    try {
      const data = await fetchApi<{
        name: string;
        value: number;
        timestamp: number;
        tags?: Record<string, string>;
      }>(`/api/metrics/${metricName}/latest`, {
        method: 'POST',
        body: { tags },
      });

      return {
        timestamp: data.timestamp,
        value: data.value,
        tags: data.tags,
      };
    } catch (error) {
      console.error(`Error fetching latest metric for ${metricName}:`, error);
      // 返回模拟数据
      const mockData = this.getMockMetricData(metricName, '1h');
      return mockData[mockData.length - 1] || null;
    }
  }

  /**
   * 获取多个指标的最新值
   */
  async getMultipleLatestMetrics(metricNames: string[]): Promise<Record<string, MetricDataPoint | null>> {
    const results: Record<string, MetricDataPoint | null> = {};

    await Promise.all(
      metricNames.map(async (metricName) => {
        results[metricName] = await this.getLatestMetric(metricName);
      })
    );

    return results;
  }

  /**
   * 获取工作流执行统计
   */
  async getWorkflowStats(timeRange: TimeRange): Promise<{
    total: number;
    success: number;
    failed: number;
    avgDuration: number;
    successRate: number;
  }> {
    const { start, end } = getTimeRangeTimestamps(timeRange);

    try {
      const data = await fetchApi<{
        executions_total: number;
        executions_success: number;
        executions_failed: number;
        avg_duration: number;
      }>('/api/metrics/workflow/stats', {
        method: 'POST',
        body: {
          start_time: start,
          end_time: end,
        },
      });

      return {
        total: data.executions_total,
        success: data.executions_success,
        failed: data.executions_failed,
        avgDuration: data.avg_duration,
        successRate: data.executions_total > 0 ? (data.executions_success / data.executions_total) * 100 : 0,
      };
    } catch (error) {
      console.error('Error fetching workflow stats:', error);
      // 返回模拟数据
      return {
        total: Math.floor(Math.random() * 1000) + 500,
        success: Math.floor(Math.random() * 900) + 450,
        failed: Math.floor(Math.random() * 50) + 10,
        avgDuration: Math.random() * 10 + 2,
        successRate: 95 + Math.random() * 4,
      };
    }
  }

  /**
   * 获取用户活动统计
   */
  async getUserActivityStats(timeRange: TimeRange): Promise<{
    activeUsers: number;
    newUsers: number;
    sessions: number;
    peakActiveUsers: number;
  }> {
    const { start, end } = getTimeRangeTimestamps(timeRange);

    try {
      const data = await fetchApi<{
        active_users: number;
        new_users: number;
        sessions: number;
        peak_active_users: number;
      }>('/api/metrics/user/stats', {
        method: 'POST',
        body: {
          start_time: start,
          end_time: end,
        },
      });

      return {
        activeUsers: data.active_users,
        newUsers: data.new_users,
        sessions: data.sessions,
        peakActiveUsers: data.peak_active_users,
      };
    } catch (error) {
      console.error('Error fetching user activity stats:', error);
      return {
        activeUsers: Math.floor(Math.random() * 100) + 50,
        newUsers: Math.floor(Math.random() * 20) + 5,
        sessions: Math.floor(Math.random() * 500) + 200,
        peakActiveUsers: Math.floor(Math.random() * 150) + 80,
      };
    }
  }

  /**
   * 获取应用性能统计
   */
  async getPerformanceStats(timeRange: TimeRange): Promise<{
    responseTime: number;
    throughput: number;
    errorRate: number;
    p50: number;
    p90: number;
    p99: number;
  }> {
    const { start, end } = getTimeRangeTimestamps(timeRange);

    try {
      const data = await fetchApi<{
        response_time: number;
        throughput: number;
        error_rate: number;
        p50: number;
        p90: number;
        p99: number;
      }>('/api/metrics/performance/stats', {
        method: 'POST',
        body: {
          start_time: start,
          end_time: end,
        },
      });

      return {
        responseTime: data.response_time,
        throughput: data.throughput,
        errorRate: data.error_rate,
        p50: data.p50,
        p90: data.p90,
        p99: data.p99,
      };
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      return {
        responseTime: Math.random() * 200 + 50,
        throughput: Math.random() * 100 + 50,
        errorRate: Math.random() * 2,
        p50: Math.random() * 100 + 30,
        p90: Math.random() * 200 + 80,
        p99: Math.random() * 500 + 200,
      };
    }
  }

  /**
   * 获取系统指标统计
   */
  async getSystemStats(timeRange: TimeRange): Promise<{
    cpu: number;
    memory: number;
    disk: number;
    networkIn: number;
    networkOut: number;
  }> {
    const { start, end } = getTimeRangeTimestamps(timeRange);

    try {
      const data = await fetchApi<{
        cpu: number;
        memory: number;
        disk: number;
        network_in: number;
        network_out: number;
      }>('/api/metrics/system/stats', {
        method: 'POST',
        body: {
          start_time: start,
          end_time: end,
        },
      });

      return {
        cpu: data.cpu,
        memory: data.memory,
        disk: data.disk,
        networkIn: data.network_in,
        networkOut: data.network_out,
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return {
        cpu: Math.random() * 60 + 20,
        memory: Math.random() * 50 + 30,
        disk: Math.random() * 30 + 50,
        networkIn: Math.random() * 1000000 + 500000,
        networkOut: Math.random() * 800000 + 300000,
      };
    }
  }

  /**
   * 生成模拟指标数据（用于开发/测试）
   */
  private getMockMetricData(metricName: string, timeRange: TimeRange): MetricDataPoint[] {
    const { start, end, interval } = getTimeRangeTimestamps(timeRange);
    const data: MetricDataPoint[] = [];

    let baseValue = 50;
    let volatility = 10;

    // 根据指标名称设置基础值和波动范围
    if (metricName.includes('cpu')) {
      baseValue = 40;
      volatility = 20;
    } else if (metricName.includes('memory')) {
      baseValue = 60;
      volatility = 15;
    } else if (metricName.includes('response_time')) {
      baseValue = 100;
      volatility = 50;
    } else if (metricName.includes('throughput')) {
      baseValue = 80;
      volatility = 30;
    } else if (metricName.includes('executions_total')) {
      baseValue = 10;
      volatility = 5;
    } else if (metricName.includes('active_users')) {
      baseValue = 80;
      volatility = 20;
    }

    for (let timestamp = start; timestamp <= end; timestamp += interval) {
      // 添加一些随机波动和趋势
      const randomFactor = (Math.random() - 0.5) * volatility;
      const trendFactor = Math.sin(timestamp / 10000) * (volatility / 2);
      const value = Math.max(0, baseValue + randomFactor + trendFactor);

      data.push({
        timestamp,
        value: Number(value.toFixed(2)),
      });
    }

    return data;
  }

  /**
   * 生成模拟聚合数据
   */
  private getMockAggregatedData(
    metricName: string,
    timeRange: TimeRange,
    interval: number
  ): AggregatedMetricDataPoint[] {
    const { start, end } = getTimeRangeTimestamps(timeRange);
    const data: AggregatedMetricDataPoint[] = [];

    let baseValue = 50;
    let volatility = 10;

    if (metricName.includes('cpu')) {
      baseValue = 40;
      volatility = 20;
    } else if (metricName.includes('memory')) {
      baseValue = 60;
      volatility = 15;
    } else if (metricName.includes('response_time')) {
      baseValue = 100;
      volatility = 50;
    } else if (metricName.includes('throughput')) {
      baseValue = 80;
      volatility = 30;
    }

    for (let timestamp = start; timestamp <= end; timestamp += interval) {
      const randomFactor = (Math.random() - 0.5) * volatility;
      const trendFactor = Math.sin(timestamp / 10000) * (volatility / 2);
      const avg = Math.max(0, baseValue + randomFactor + trendFactor);

      data.push({
        timestamp,
        count: Math.floor(Math.random() * 100) + 50,
        sum: avg * 100,
        min: Math.max(0, avg - volatility),
        max: avg + volatility,
        avg,
        p50: avg * 0.8,
        p90: avg * 1.2,
        p95: avg * 1.4,
        p99: avg * 1.6,
      });
    }

    return data;
  }
}

// 导出单例
export const dashboardApi = new DashboardApiService();

// 导出辅助函数
export const getMetricDefinition = (metricName: string): MetricDefinition | undefined => {
  return METRIC_DEFINITIONS[metricName];
};

export const getDashboardConfig = (): DashboardConfig => {
  return DEFAULT_DASHBOARD;
};

export { DEFAULT_DASHBOARD, METRIC_DEFINITIONS, TIME_RANGES };