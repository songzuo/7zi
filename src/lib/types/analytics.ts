/**
 * Data Analysis Types
 * 数据分析类型定义
 */

// ============================================================================
// Analytics Data Types
// ============================================================================

export interface AnalyticsMetrics {
  agents: AgentMetrics;
  users: UserMetrics;
  tasks: TaskMetrics;
  revenue: RevenueMetrics;
  performance: PerformanceMetrics;
}

export interface AgentMetrics {
  total: number;
  active: number;
  idle: number;
  offline: number;
  workingHours: number;
  tasksCompleted: number;
  tokensUsed: number;
  byProvider: Record<string, AgentProviderMetrics>;
}

export interface AgentProviderMetrics {
  count: number;
  tasksCompleted: number;
  tokensUsed: number;
  averageResponseTime: number;
}

export interface UserMetrics {
  total: number;
  activeToday: number;
  activeWeek: number;
  newUsers: number;
  retentionRate: number;
  averageSessionDuration: number;
}

export interface TaskMetrics {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
  completionRate: number;
  averageCompletionTime: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}

export interface RevenueMetrics {
  total: number;
  monthly: number;
  weekly: number;
  daily: number;
  growthRate: number;
  bySource: Record<string, number>;
  conversionRate: number;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  uptime: number;
  errorRate: number;
  throughput: number;
  cacheHitRate: number;
}

// ============================================================================
// Time Series Data
// ============================================================================

export interface TimeSeriesDataPoint {
  timestamp: string;
  date?: string;
  [key: string]: string | number | undefined;
}

export type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

// ============================================================================
// Filter Options
// ============================================================================

export interface AnalyticsFilters {
  timeRange: TimeRange;
  customRange?: DateRange;
  agentIds?: string[];
  taskStatuses?: string[];
  taskPriorities?: string[];
  taskTypes?: string[];
  providers?: string[];
  metrics?: string[];
  compareWith?: TimeRange; // For comparison
}

// ============================================================================
// Chart Types
// ============================================================================

export type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radar' | 'scatter' | 'heatmap';

export interface ChartConfig {
  type: ChartType;
  title: string;
  data: TimeSeriesDataPoint[];
  metrics: string[];
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  height?: number;
}

// ============================================================================
// Dashboard Layout
// ============================================================================

export interface DashboardWidget {
  id: string;
  type: 'stat-card' | 'chart' | 'table' | 'list' | 'custom';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: ChartConfig | Record<string, unknown>;
  refreshInterval?: number;
  visible?: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  widgets: DashboardWidget[];
  columns: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Export Formats
// ============================================================================

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  data: TimeSeriesDataPoint[] | Record<string, unknown>[];
  filename?: string;
  includeHeaders?: boolean;
  filters?: AnalyticsFilters;
  dateRange?: DateRange;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AnalyticsResponse<T = unknown> {
  success: boolean;
  data: T;
  timestamp: string;
  filters?: AnalyticsFilters;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsError {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface Statistic {
  label: string;
  value: number | string;
  change?: {
    value: number;
    period: string;
    type: 'increase' | 'decrease' | 'stable';
  };
  format?: 'number' | 'currency' | 'percentage' | 'bytes' | 'duration';
}

export interface TrendAnalysis {
  period: string;
  value: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}
