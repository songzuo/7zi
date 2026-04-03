/**
 * Log Aggregator - v1.10.0
 * 企业级日志聚合和分析系统
 * 
 * 功能特性：
 * - 多源日志收集（文件、stdout、HTTP）
 * - 智能日志解析（JSON、Nginx、Apache、应用日志）
 * - 高性能时序存储
 * - 异常检测和趋势分析
 * - 基于规则和机器学习的告警
 * - 全文搜索和结构化查询
 * 
 * 技术规格：
 * - 支持 100GB+/天 日志量
 * - 搜索延迟 < 1秒
 * - 高可用架构
 */

// Main exports
export { LogAggregator, createLogAggregator, getDefaultConfig } from './LogAggregator.js';

// Types
export type * from './types.js';

// Collectors
export {
  BaseLogCollector,
  FileLogCollector,
  HttpLogCollector,
  StdoutLogCollector,
  LogCollectorFactory,
} from './collector/LogCollector.js';

// Parsers
export {
  BaseLogParser,
  JsonLogParser,
  NginxLogParser,
  ApacheLogParser,
  ApplicationLogParser,
  CustomRegexParser,
  LogParserFactory,
} from './parser/LogParser.js';

// Storage
export {
  MemoryLogStorage,
  FileLogStorage,
  LogStorageFactory,
} from './storage/LogStorage.js';

// Analysis
export { LogAnalysisEngine } from './analysis/AnalysisEngine.js';

// Alerting
export { AlertManager } from './alerting/AlertManager.js';

// Search
export { LogSearchApi } from './search/SearchApi.js';

// Utils
export * from './utils/helpers.js';

// Version
export const VERSION = '1.10.0';
export const BUILD_DATE = new Date().toISOString();