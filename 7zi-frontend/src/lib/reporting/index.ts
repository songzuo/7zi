/**
 * Reporting Module
 * 报表模块入口
 */

// Data Aggregator
// USED in: src/app/api/reports/route.ts
export {
  ReportDataAggregator,
  createTimeRange,
  UserActivityDataSource,
  PerformanceDataSource,
  createDefaultAggregator,
} from './data-aggregator'

export type {
  TimeRange,
  TimeRangeConfig,
  AggregatedMetric,
  AggregatedData,
  DataSource,
  CacheConfig,
  AggregatorConfig,
} from './data-aggregator'

// Report Generator
// USED in: src/app/api/reports/route.ts
export {
  ReportGenerator,
  createReportGenerator,
} from './report-generator'

export type {
  ReportType,
  ReportConfig,
  ReportOptions,
  GeneratedReport,
  ReportMetadata,
  ChartData,
  ChartDataset,
} from './report-generator'

// NLG Processor
// USED in: src/app/api/reports/route.ts
export {
  NLGProcessor,
  createNLGProcessor,
  generateMultilingualText,
  generateMultiToneText,
} from './nlg-processor'

export type {
  ToneStyle,
  Language,
  NLGConfig,
  GeneratedText,
} from './nlg-processor'

// NOTE: All exports above are actively used in the reporting API route.
// No unused exports to remove at this time.