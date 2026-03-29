/**
 * Prefetch Module Exports
 * 
 * 智能预加载系统统一导出
 */

// User Behavior Analyzer
export {
  UserBehaviorAnalyzer,
  globalBehaviorAnalyzer,
  type UserBehaviorPattern,
  type UserSession,
  type UserBehaviorData,
} from './user-behavior';

// Predictive Prefetcher
export {
  PredictivePrefetcher,
  globalPrefetcher,
  type UserContext,
  type PrefetchPrediction,
  type PrefetchResult as PredictivePrefetchResult,
} from './predictive-prefetcher';

// Route Prefetcher
export {
  RoutePrefetcher,
  ResourcePriorityManager,
  globalRoutePrefetcher,
  ROUTE_PREFETCH_CONFIGS,
  type RoutePrefetchConfig,
  type PrefetchContext,
} from './route-prefetcher';

// Resource Prefetcher
export {
  ResourcePrefetcher,
  globalResourcePrefetcher,
  PREFETCH_PRESETS,
  type ResourceConfig,
  type PrefetchResult as ResourcePrefetchResult,
  type ViewportBasedConfig,
} from './resource-prefetcher';

// Prefetch Provider
export {
  PrefetchProvider,
  usePrefetchContext,
  type PrefetchProviderProps,
  type PrefetchMetrics,
} from './prefetch-provider';

// Hooks
export {
  usePrefetch,
  useBatchPrefetch,
  type UsePrefetchOptions,
  type PrefetchResult,
} from './hooks/use-prefetch';

export {
  usePredictivePrefetch,
  type UsePredictivePrefetchOptions,
  type PredictionResult,
} from './hooks/use-predictive-prefetch';

export {
  useResourceHint,
  useBatchResourceHints,
  useDnsPrefetch,
  usePreconnect,
  usePrefetchImages,
  usePreloadFonts,
  useAllResourceHints,
  useSmartResourceHints,
  type ResourceHintConfig,
  type ResourceHintResult,
} from './hooks/use-resource-hint';
