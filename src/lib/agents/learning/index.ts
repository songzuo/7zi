/**
 * Learning Module - Agent Learning System 2.0
 *
 * Core modules for task learning, time prediction, and optimization
 */

export {
  FeatureEngineer,
  InMemoryFeatureStore,
  createFeatureEngineer,
  createFeatureEngineerWithStore,
  type FeatureEngineerConfig,
  type TaskFeatures,
  type AgentFeatures,
  type ContextFeatures,
  type NormalizedFeatures,
  type FeatureImportance,
  type FeatureStore,
  type TaskInput,
  type AgentInput,
  type TaskComplexity,
} from './feature-engineer'

export {
  AdaptiveScheduler,
  createAdaptiveScheduler,
  type SchedulingDecision,
  type AdaptiveSchedulerConfig,
  type AgentState,
} from './adaptive-scheduler'

export {
  LearningOptimizer,
  type TaskPattern,
  type OptimizationRecommendation,
  type AgentPerformanceProfile,
  type TaskTypeAnalysis,
  type OptimizationMetrics,
  type LearningOptimizerConfig,
} from './learning-optimizer'

export {
  TimePredictionEngine,
  createTimePredictionEngine,
  type PredictionInput,
  type PredictionStrategy,
  type TimePredictionConfig,
} from './time-prediction-engine'

// Re-export common types
export type {
  TaskType,
  AgentId,
  PredictionResult,
  CapabilityScore,
  AgentLearningStats,
  TaskHistoryRecord,
  WeightAdjustment,
  LearningSystemStats,
  AggregatedStats,
} from './types'

// Success Prediction Model
export {
  SuccessPredictionModel,
  createSuccessPredictionModel,
  predictSuccess,
  type SuccessPredictionInput,
  type SuccessPredictionResult,
  type SuccessPredictionConfig,
} from './models/success-prediction-model'

// v1.9.0 - Time Prediction Model
export {
  TimePredictionModel,
  createTimePredictionModel,
  adaptToEngineFormat,
  type TimePredictionInput,
  type TimePredictionResult,
  type TimePredictionModelConfig,
} from './models/time-prediction-model'
