/**
 * Agent Learning System
 *
 * Provides adaptive learning and optimization capabilities for agent scheduling
 *
 * @module agents/learning
 */

// Types
export * from './types'

// Core learning system
export { AdaptiveLearner, adaptiveLearner } from './adaptive-learner'

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

/**
 * Initialize the complete learning system
 *
 * This function initializes all learning components and loads persisted data
 */
export async function initializeLearningSystem(): Promise<{
  timePredictor: TaskTimePredictor
  capabilityAssessor: AgentCapabilityAssessor
  persistence: LearningPersistence
}> {
  // Load dependencies dynamically to avoid circular references
  const timePredictor = taskTimePredictor
  const capabilityAssessor = agentCapabilityAssessor

  // Initialize persistence with model references
  const persistence = new LearningPersistence({}, timePredictor, capabilityAssessor)

  // Load persisted data
  await persistence.initialize()

  return {
    timePredictor,
    capabilityAssessor,
    persistence,
  }
}

// Import types for function signature
import { TaskTimePredictor, taskTimePredictor } from './time-prediction'
import { AgentCapabilityAssessor, agentCapabilityAssessor } from './agent-capability'
import { LearningPersistence } from './learning-data'
