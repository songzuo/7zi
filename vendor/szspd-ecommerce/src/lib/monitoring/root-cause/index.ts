// @ts-nocheck
/**
 * Root Cause Analysis Module
 * Performance root cause analysis utilities
 */

export {
  PerformanceWaterfall,
  performanceWaterfall,
  type ResourceTiming,
  type ResourceBreakdown,
  type WaterfallEntry,
  type WaterfallAnalysis,
  type CriticalPathSegment,
  createMockResourceTiming,
  fromPerformanceResourceTiming,
} from './performance-waterfall'

export {
  PerformanceWaterfall as PerformanceWaterfallEnhanced,
  performanceWaterfall as performanceWaterfallEnhanced,
  type FirstContentfulPaintData,
} from './performance-waterfall-enhanced'

export {
  SlowRequestTracker,
  slowRequestTracker,
  type RequestTiming,
  type SlowRequestAnalysis,
  type RequestBottleneck,
  type SlowRequestThresholds,
  type SlowRequestStats,
  createMockRequestTiming,
  measureRequestTiming,
} from './slow-request-tracker'

export {
  BottleneckDetector,
  bottleneckDetector,
  type Bottleneck,
  type BottleneckAnalysis,
  type BottleneckRecommendation,
  type PerformanceProfile,
  type MemorySnapshot,
  createMockPerformanceProfile,
} from './bottleneck-detector'

// New exports: Diagnostic Suggestion Generator (v1.8.1)
export {
  DiagnosticSuggestionGenerator,
  diagnosticGenerator,
  type DiagnosticSuggestion,
  type DiagnosticReport,
  createDiagnosticReport,
} from './diagnostic-suggestion-generator'

// New exports: Performance Root Cause Analyzer
export {
  PerformanceRootCauseAnalyzer,
  performanceRootCauseAnalyzer,
  type CoreWebVitalsMetrics,
  type MemoryMetrics,
  type MemorySample,
  type NetworkTimingBreakdown,
  type NetworkBottleneck,
  type RenderIssue,
  type SlowPageDiagnosis,
  type RootCauseItem,
  type MemoryLeakIndication,
  type PerformanceRootCauseAnalysis,
  type PriorityAction,
  CORE_WEB_VITALS_THRESHOLDS,
  NETWORK_THRESHOLDS,
  MEMORY_THRESHOLDS,
  RENDER_THRESHOLDS,
  createMockCoreWebVitals,
  createMockMemoryMetrics,
  createMockNetworkTiming,
} from './performance-root-cause'

// New exports: Performance Budget Controller
export {
  PerformanceBudgetController,
  performanceBudgetController,
  type BudgetThreshold,
  type BudgetViolation,
  type BudgetComplianceReport,
  type BudgetAlert,
  type BudgetHistory,
  DEFAULT_BUDGET_THRESHOLDS,
  createMockPerformanceMetrics,
} from './performance-budget'
