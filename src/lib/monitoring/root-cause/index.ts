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
} from './performance-waterfall';

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
} from './slow-request-tracker';

export {
  BottleneckDetector,
  bottleneckDetector,
  type Bottleneck,
  type BottleneckAnalysis,
  type BottleneckRecommendation,
  type PerformanceProfile,
  createMockPerformanceProfile,
} from './bottleneck-detector';
