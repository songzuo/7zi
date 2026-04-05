/**
 * Dashboard Data Models
 * 数据可视化仪表板数据模型定义
 */

// 时间范围选项
export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';

// 时间范围配置
export interface TimeRangeConfig {
  label: string;
  value: TimeRange;
  seconds: number;
  interval: number; // 聚合间隔（秒）
}

export const TIME_RANGES: TimeRangeConfig[] = [
  { label: '1小时', value: '1h', seconds: 3600, interval: 60 },
  { label: '6小时', value: '6h', seconds: 21600, interval: 300 },
  { label: '24小时', value: '24h', seconds: 86400, interval: 600 },
  { label: '7天', value: '7d', seconds: 604800, interval: 3600 },
  { label: '30天', value: '30d', seconds: 2592000, interval: 86400 },
];

// 指标类型
export type MetricType = 'gauge' | 'counter' | 'histogram';

// 指标定义
export interface MetricDefinition {
  name: string;
  displayName: string;
  type: MetricType;
  unit: string;
  category: MetricCategory;
  description: string;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'p50' | 'p90' | 'p95' | 'p99';
}

// 指标分类
export type MetricCategory =
  | 'system'
  | 'application'
  | 'business'
  | 'workflow'
  | 'user'
  | 'performance';

// 指标分类配置
export const METRIC_CATEGORIES: Record<MetricCategory, { label: string; icon: string; color: string }> = {
  system: { label: '系统指标', icon: 'Server', color: '#3b82f6' },
  application: { label: '应用指标', icon: 'AppWindow', color: '#10b981' },
  business: { label: '业务指标', icon: 'TrendingUp', color: '#f59e0b' },
  workflow: { label: '工作流', icon: 'Workflow', color: '#8b5cf6' },
  user: { label: '用户活动', icon: 'Users', color: '#ec4899' },
  performance: { label: '性能指标', icon: 'Zap', color: '#ef4444' },
};

// 预定义指标
export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // 系统指标
  'system.cpu_usage': {
    name: 'system.cpu_usage',
    displayName: 'CPU 使用率',
    type: 'gauge',
    unit: '%',
    category: 'system',
    description: '系统 CPU 使用率',
    aggregation: 'avg',
  },
  'system.memory_usage': {
    name: 'system.memory_usage',
    displayName: '内存使用率',
    type: 'gauge',
    unit: '%',
    category: 'system',
    description: '系统内存使用率',
    aggregation: 'avg',
  },
  'system.disk_usage': {
    name: 'system.disk_usage',
    displayName: '磁盘使用率',
    type: 'gauge',
    unit: '%',
    category: 'system',
    description: '系统磁盘使用率',
    aggregation: 'avg',
  },
  'system.network_in': {
    name: 'system.network_in',
    displayName: '网络入流量',
    type: 'counter',
    unit: 'bytes/s',
    category: 'system',
    description: '网络入站流量',
    aggregation: 'sum',
  },
  'system.network_out': {
    name: 'system.network_out',
    displayName: '网络出流量',
    type: 'counter',
    unit: 'bytes/s',
    category: 'system',
    description: '网络出站流量',
    aggregation: 'sum',
  },

  // 应用指标
  'app.response_time': {
    name: 'app.response_time',
    displayName: '响应时间',
    type: 'histogram',
    unit: 'ms',
    category: 'application',
    description: '应用响应时间',
    aggregation: 'p95',
  },
  'app.throughput': {
    name: 'app.throughput',
    displayName: '吞吐量',
    type: 'counter',
    unit: 'req/s',
    category: 'application',
    description: '每秒请求数',
    aggregation: 'sum',
  },
  'app.error_rate': {
    name: 'app.error_rate',
    displayName: '错误率',
    type: 'gauge',
    unit: '%',
    category: 'application',
    description: '请求错误率',
    aggregation: 'avg',
  },

  // 业务指标
  'business.orders_per_minute': {
    name: 'business.orders_per_minute',
    displayName: '每分钟订单数',
    type: 'counter',
    unit: 'orders/min',
    category: 'business',
    description: '每分钟订单数量',
    aggregation: 'sum',
  },
  'business.revenue': {
    name: 'business.revenue',
    displayName: '收入',
    type: 'counter',
    unit: 'CNY',
    category: 'business',
    description: '总收入',
    aggregation: 'sum',
  },

  // 工作流指标
  'workflow.executions_total': {
    name: 'workflow.executions_total',
    displayName: '工作流执行总数',
    type: 'counter',
    unit: 'count',
    category: 'workflow',
    description: '工作流执行总次数',
    aggregation: 'sum',
  },
  'workflow.executions_success': {
    name: 'workflow.executions_success',
    displayName: '成功执行数',
    type: 'counter',
    unit: 'count',
    category: 'workflow',
    description: '成功执行的工作流次数',
    aggregation: 'sum',
  },
  'workflow.executions_failed': {
    name: 'workflow.executions_failed',
    displayName: '失败执行数',
    type: 'counter',
    unit: 'count',
    category: 'workflow',
    description: '失败执行的工作流次数',
    aggregation: 'sum',
  },
  'workflow.avg_duration': {
    name: 'workflow.avg_duration',
    displayName: '平均执行时长',
    type: 'histogram',
    unit: 's',
    category: 'workflow',
    description: '工作流平均执行时长',
    aggregation: 'avg',
  },

  // 用户活动指标
  'user.active_users': {
    name: 'user.active_users',
    displayName: '活跃用户数',
    type: 'gauge',
    unit: 'users',
    category: 'user',
    description: '当前活跃用户数',
    aggregation: 'avg',
  },
  'user.new_users': {
    name: 'user.new_users',
    displayName: '新用户数',
    type: 'counter',
    unit: 'users',
    category: 'user',
    description: '新增用户数',
    aggregation: 'sum',
  },
  'user.sessions': {
    name: 'user.sessions',
    displayName: '会话数',
    type: 'counter',
    unit: 'sessions',
    category: 'user',
    description: '用户会话数',
    aggregation: 'sum',
  },

  // 性能指标
  'performance.p50_latency': {
    name: 'performance.p50_latency',
    displayName: 'P50 延迟',
    type: 'histogram',
    unit: 'ms',
    category: 'performance',
    description: '50分位延迟',
    aggregation: 'p50',
  },
  'performance.p90_latency': {
    name: 'performance.p90_latency',
    displayName: 'P90 延迟',
    type: 'histogram',
    unit: 'ms',
    category: 'performance',
    description: '90分位延迟',
    aggregation: 'p90',
  },
  'performance.p99_latency': {
    name: 'performance.p99_latency',
    displayName: 'P99 延迟',
    type: 'histogram',
    unit: 'ms',
    category: 'performance',
    description: '99分位延迟',
    aggregation: 'p99',
  },
};

// 指标数据点
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

// 聚合指标数据点
export interface AggregatedMetricDataPoint {
  timestamp: number;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50?: number;
  p90?: number;
  p95?: number;
  p99?: number;
}

// 统计卡片数据
export interface StatCardData {
  title: string;
  value: number;
  unit: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  trend?: MetricDataPoint[];
  category: MetricCategory;
}

// 图表数据
export interface ChartData {
  metricName: string;
  metricDefinition: MetricDefinition;
  data: AggregatedMetricDataPoint[];
  timeRange: TimeRange;
}

// 仪表板配置
export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  timeRange: TimeRange;
  refreshInterval: number; // 秒
  layout: DashboardLayout;
}

// 仪表板布局
export interface DashboardLayout {
  stats: StatCardConfig[];
  charts: ChartConfig[];
}

// 统计卡片配置
export interface StatCardConfig {
  metricName: string;
  aggregation?: string;
  showTrend?: boolean;
  width: number; // 1-12 (grid columns)
}

// 图表配置
export interface ChartConfig {
  metricName: string;
  chartType: 'line' | 'bar' | 'area';
  aggregation?: string;
  height: number;
  width: number; // 1-12 (grid columns)
}

// 预定义仪表板
export const DEFAULT_DASHBOARD: DashboardConfig = {
  id: 'default',
  name: '默认仪表板',
  description: '系统概览仪表板',
  metrics: [
    'system.cpu_usage',
    'system.memory_usage',
    'app.response_time',
    'app.throughput',
    'workflow.executions_total',
    'workflow.executions_success',
    'workflow.executions_failed',
    'user.active_users',
  ],
  timeRange: '24h',
  refreshInterval: 60,
  layout: {
    stats: [
      { metricName: 'workflow.executions_total', aggregation: 'sum', showTrend: true, width: 3 },
      { metricName: 'workflow.executions_success', aggregation: 'sum', showTrend: false, width: 3 },
      { metricName: 'workflow.executions_failed', aggregation: 'sum', showTrend: false, width: 3 },
      { metricName: 'user.active_users', aggregation: 'avg', showTrend: true, width: 3 },
    ],
    charts: [
      { metricName: 'system.cpu_usage', chartType: 'line', aggregation: 'avg', height: 300, width: 6 },
      { metricName: 'system.memory_usage', chartType: 'line', aggregation: 'avg', height: 300, width: 6 },
      { metricName: 'app.response_time', chartType: 'area', aggregation: 'p95', height: 300, width: 12 },
      { metricName: 'app.throughput', chartType: 'bar', aggregation: 'sum', height: 300, width: 6 },
      { metricName: 'workflow.avg_duration', chartType: 'line', aggregation: 'avg', height: 300, width: 6 },
    ],
  },
};