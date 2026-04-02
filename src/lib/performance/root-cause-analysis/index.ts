/**
 * Root Cause Analysis Module
 *
 * Automated root cause analysis for performance issues
 *
 * This module provides comprehensive tools for analyzing performance problems,
 * identifying bottlenecks, and generating actionable recommendations.
 *
 * @module root-cause-analysis
 *
 * @example
 * ```typescript
 * import RootCauseAnalyzer from './analyzer';
 * import { DatabaseTracker } from './database-tracker';
 * import { APITracker } from './api-tracker';
 * import { RenderingTracker } from './rendering-tracker';
 *
 * // Create analyzer
 * const analyzer = new RootCauseAnalyzer();
 *
 * // Generate comprehensive report
 * const report = analyzer.generateReport();
 * console.log(report.summary);
 * ```
 */

import RootCauseAnalyzer from './analyzer'

// Core Analyzer
export { default as RootCauseAnalyzer, RootCauseAnalyzer as default } from './analyzer'

// New Root Cause Analysis Modules
export { CorrelationEngine } from './correlation-engine'
export { CausalityAnalyzer } from './causality-analyzer'
export { CallChainTracer } from './call-chain-tracer'

// Intelligent RCA (v1.9.0)
export { 
  IntelligentRCA, 
  FaultKnowledgeBase,
  createIntelligentRCA,
  type RCAConfig,
  type Incident,
  type Symptom,
  type Metric,
  type RootCauseReport,
  type PropagationChain,
  type PropagationNode,
  type PropagationEdge,
  type Correlation as IntelligentCorrelation,
  type Recommendation,
  type KnownIssue,
  type Resolution
} from './IntelligentRCA'

// ============================================================================
// Trackers
// ============================================================================

export { DatabaseTracker } from './database-tracker'
export { APITracker } from './api-tracker'
export { RenderingTracker } from './rendering-tracker'

// ============================================================================
// Types
// ============================================================================

export type {
  // Severity
  SeverityLevel,
  Severity,

  // Root Cause Types
  RootCauseType,

  // Database Types
  DatabaseIssueType,
  DatabaseQuery,
  ExecutionPlan,
  DatabaseAnalysis,
  QueryStatistics,
  DatabaseIssue,
  DatabaseRecommendation,

  // API Types
  APIIssueType,
  APIRequest,
  APIAnalysis,
  APIStatistics,
  APIIssue,
  ErrorRateAnalysis,
  APIRecommendation,

  // Rendering Types
  RenderingIssueType,
  RenderingMetrics,
  RenderingAnalysis,
  RenderingIssue,
  RenderingBottleneck,
  RenderingRecommendation,

  // Waterfall Types
  WaterfallEntry,
  CriticalPathNode,
  WaterfallAnalysis,
  WaterfallBottleneck,
  OptimizationOpportunity,
  WaterfallSummary,

  // Analysis Report Types
  RootCause,
  Impact,
  FixRecommendation,
  AnalysisReport,
  ReportSummary,
  PrioritizedAction,
  PerformanceMetrics,

  // Configuration
  RootCauseAnalysisConfig,
} from './types'

// ============================================================================
// Correlation Engine Types
// ============================================================================

export type {
  AnomalyEvent,
  EventContext,
  Correlation,
  CorrelationType,
  CorrelationPattern,
  CorrelationGroup,
  CorrelationConfig,
} from './correlation-engine'

export { DEFAULT_CORRELATION_CONFIG } from './correlation-engine'

// ============================================================================
// Causality Analyzer Types
// ============================================================================

export type {
  TimeSeriesPoint,
  CausalChain,
  CausalNode,
  CausalTimeline,
  CausalInterval,
  CausalAnalysis,
  CausalityRule,
  CausalityConfig,
} from './causality-analyzer'

export { DEFAULT_CAUSALITY_CONFIG } from './causality-analyzer'

// ============================================================================
// Call Chain Tracer Types
// ============================================================================

export type {
  CallNode,
  CallNodeType,
  CallNodeMetadata,
  CallNodeMetrics,
  CallChain,
  CallChainAnalysis,
  CallChainSummary,
  CallBottleneck,
  HotPath,
  CriticalPath,
  CallChainRecommendation,
  CallChainConfig,
} from './call-chain-tracer'

export { DEFAULT_CALL_CHAIN_CONFIG } from './call-chain-tracer'

// ============================================================================
// Default Configuration
// ============================================================================

export { DEFAULT_CONFIG } from './types'

// ============================================================================
// Analyzer Types
// ============================================================================

export type {
  SlowRequestTrace,
  TimelineEntry,
  ResourceAnalysis,
  ResourceBottleneck,
} from './analyzer'

// Re-export HotPath from analyzer with alias to avoid conflict
export type { HotPath as AnalyzerHotPath } from './analyzer'

// ============================================================================
// Integration with Anomaly Detection
// ============================================================================

/**
 * Root Cause Analysis Integration
 *
 * Integrates with the anomaly-detection module for enhanced analysis.
 *
 * @example
 * ```typescript
 * import { RootCauseAnalyzer } from './root-cause-analysis';
 * import { AnomalyDetector } from '../anomaly-detection/anomaly-detector';
 *
 * const analyzer = new RootCauseAnalyzer();
 * const detector = new AnomalyDetector();
 *
 * // Detect anomalies
 * const anomalies = detector.detectAnomalies();
 *
 * // For each anomaly, perform root cause analysis
 * anomalies.forEach(anomaly => {
 *   const report = analyzer.generateReport();
 *   console.log(`Root cause for ${anomaly.metric}:`, report.rootCauses);
 * });
 * ```
 */

/**
 * Anomaly detector interface for integration
 */
export interface AnomalyDetector {
  on(event: string, callback: (anomaly: AnomalyDetectionEvent) => void): void
}

export interface AnomalyDetectionEvent {
  metric: string
  value: number
  threshold: number
  timestamp: number
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export const integrateWithAnomalyDetection = (
  analyzer: InstanceType<typeof RootCauseAnalyzer>,
  detector: AnomalyDetector
) => {
  // Set up automatic root cause analysis on anomaly detection
  detector.on('anomaly', (anomaly: AnomalyDetectionEvent) => {
    const report = analyzer.generateReport()
    return report
  })

  return {
    analyzer,
    detector,
  }
}

// ============================================================================
// Module Info
// ============================================================================

export const MODULE_INFO = {
  name: 'Root Cause Analysis',
  version: '1.0.0',
  description: 'Automated root cause analysis for performance issues',
  author: 'OpenClaw Performance Team',
  capabilities: [
    'Performance waterfall analysis',
    'Slow request tracing',
    'Resource usage analysis',
    'Code-level hot path identification',
    'Database query analysis',
    'API performance tracking',
    'Rendering performance monitoring',
    'Comprehensive reporting',
  ],
}
