/**
 * Agent Learning System
 *
 * Provides adaptive learning and optimization capabilities for agent scheduling
 *
 * @module agents/learning
 */

// Types
export * from './types'

// Time prediction model
export {
  TaskTimePredictor,
  taskTimePredictor,
  predictCompletionTime,
  updatePredictionModel,
} from './time-prediction'
export type {
  TimePredictionConfig,
  TimeRecord,
  FeatureWeights,
  PriorKnowledge,
} from './time-prediction'

// Agent capability assessment
export {
  AgentCapabilityAssessor,
  agentCapabilityAssessor,
  assessAgentCapability,
  recordTaskForCapability,
} from './agent-capability'
export type { CapabilityAssessmentResult, CapabilityTrend } from './agent-capability'

// Data persistence
export {
  LearningPersistence,
  learningPersistence,
  initializeLearningPersistence,
  saveLearningData,
} from './learning-data'
export type { LearningState, SyncStatus } from './learning-data'

// REMOVED: The following exports are not used in the codebase:
// - AdaptiveLearner, adaptiveLearner (from adaptive-learner.ts)
// - initializeLearningSystem() function (composite initialization)
//
// These can be restored if needed in the future. They were removed to reduce bundle size.
