export type TaskType = string;
export type AgentId = string;

export interface TaskFeatures {
  taskType: TaskType;
  inputSize: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  agentId?: AgentId;
  timeOfDay: number;
  dayOfWeek: number;
  historicalAvgTime: number;
  queueDepth: number;
  agentLoad: number;
}

export interface PredictionResult {
  estimatedTime: number;
  confidence: number;
  factors: string[];
}

export interface CapabilityScore {
  taskType: TaskType;
  avgCompletionTime: number;
  successRate: number;
  sampleCount: number;
  lastTaskTime: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface AgentLearningStats {
  agentId: AgentId;
  agentName: string;
  capabilityScores: Map<TaskType, CapabilityScore>;
  overallScore: number;
  reliabilityScore: number;
  speedScore: number;
  qualityScore: number;
  currentLoad: number;
  avgResponseTime: number;
  successRate: number;
  lastUpdated: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
}

export interface TaskHistoryRecord {
  taskId: string;
  taskType: TaskType;
  agentId: AgentId;
  createdAt: number;
  startedAt: number;
  completedAt: number;
  queueWaitTime: number;
  executionTime: number;
  status: 'completed' | 'failed' | 'cancelled';
  outputSize: number;
  errorType?: string;
  retryCount: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  inputSize: number;
  agentLoadAtStart: number;
}

export interface WeightAdjustment {
  agentId: AgentId;
  taskType: TaskType;
  adjustment: number;
  reason: string;
}

export interface LearningSystemStats {
  totalAgents: number;
  activeAgents: number;
  totalTasksProcessed: number;
  avgCompletionTime: number;
  overallSuccessRate: number;
  predictionsAccuracy: number;
  lastUpdated: number;
}

export interface AggregatedStats {
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: number;
  endTime: number;
  tasksCompleted: number;
  tasksFailed: number;
  avgExecutionTime: number;
  avgQueueWaitTime: number;
  avgAgentUtilization: number;
  topPerformers: AgentId[];
  strugglingAgents: AgentId[];
  predictionAccuracy: number;
  predictionCount: number;
}

/**
 * Time prediction result
 */
export interface TimePrediction {
  /** Estimated time in minutes */
  estimatedMinutes: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Confidence interval [lower, upper] in minutes */
  confidenceInterval: [number, number];
  /** Factors that influenced the prediction */
  factors: string[];
  /** What data the prediction is based on */
  basedOn: string;
  /** Strategy used for prediction */
  strategy: 'rule-based' | 'statistical' | 'adaptive';
  /** Historical task IDs used (if any) */
  basedOnTasks: string[];
}
