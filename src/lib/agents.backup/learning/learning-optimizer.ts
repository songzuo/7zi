/**
 * Learning Optimizer
 * Analyzes task completion patterns and optimizes scheduling strategies
 * 
 * Features:
 * - Pattern detection in task completion
 * - Strategy optimization recommendations
 * - Average wait time reduction analysis
 * - Integration with AdaptiveScheduler
 * 
 * @module LearningOptimizer
 */

import type { TimePrediction } from './time-prediction-engine';
import type { SchedulingDecision } from './adaptive-scheduler';
import type { TaskType, AgentId, TaskHistoryRecord, AggregatedStats } from './types';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Task completion pattern
 */
export interface TaskPattern {
  id: string;
  type: 'time-of-day' | 'task-sequence' | 'agent-preference' | 'load-correlation';
  description: string;
  confidence: number;
  sampleCount: number;
  impact: number;           // 0-1, how significant this pattern is
  discoveredAt: number;
  data: Record<string, unknown>;
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  id: string;
  type: 'weight-adjustment' | 'capacity-change' | 'task-routing' | 'timing-adjustment';
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImprovement: number;  // percentage improvement expected
  affectedAgents: AgentId[];
  affectedTaskTypes: TaskType[];
  createdAt: number;
  appliedAt?: number;
  status: 'pending' | 'applied' | 'rejected' | 'failed';
  details: Record<string, unknown>;
}

/**
 * Agent performance profile
 */
export interface AgentPerformanceProfile {
  agentId: AgentId;
  strengths: TaskType[];
  weaknesses: TaskType[];
  optimalLoad: number;          // 0-1, load level where performance is best
  peakHours: number[];          // 0-23, hours where agent performs best
  avgWaitTimeReduction: number; // minutes saved vs average
  consistency: number;          // 0-1, how consistent the agent's performance is
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Task type analysis
 */
export interface TaskTypeAnalysis {
  taskType: TaskType;
  totalCount: number;
  avgCompletionTime: number;
  avgQueueWaitTime: number;
  successRate: number;
  bestAgents: Array<{ agentId: AgentId; avgTime: number; successRate: number }>;
  worstAgents: Array<{ agentId: AgentId; avgTime: number; successRate: number }>;
  peakHours: number[];
  bottleneckProbability: number;
  recommendedOptimizations: string[];
}

/**
 * System-wide optimization metrics
 */
export interface OptimizationMetrics {
  avgQueueWaitTime: number;
  avgCompletionTime: number;
  throughputPerHour: number;
  agentUtilizationVariance: number;
  predictionAccuracy: number;
  loadBalanceScore: number;
  overallEfficiency: number;    // 0-1 composite score
  trendDirection: 'improving' | 'stable' | 'declining';
}

/**
 * Learning Optimizer configuration
 */
export interface LearningOptimizerConfig {
  /** Minimum samples for pattern detection */
  minPatternSamples: number;
  /** Confidence threshold for recommendations */
  recommendationThreshold: number;
  /** How many historical records to analyze */
  analysisWindowSize: number;
  /** Enable automatic optimization application */
  autoApplyOptimizations: boolean;
  /** Minimum improvement threshold for recommendations */
  minImprovementThreshold: number;  // percentage
  /** Pattern detection sensitivity */
  patternSensitivity: 'low' | 'medium' | 'high';
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LearningOptimizerConfig = {
  minPatternSamples: 20,
  recommendationThreshold: 0.7,
  analysisWindowSize: 1000,
  autoApplyOptimizations: false,
  minImprovementThreshold: 5,
  patternSensitivity: 'medium'
};

// ============================================================================
// Learning Optimizer Implementation
// ============================================================================

/**
 * Learning Optimizer
 * 
 * Analyzes historical data to optimize scheduling strategies:
 * 1. Detects patterns in task completion
 * 2. Generates optimization recommendations
 * 3. Tracks optimization effectiveness
 */
export class LearningOptimizer {
  private config: LearningOptimizerConfig;
  private history: TaskHistoryRecord[] = [];
  private patterns: TaskPattern[] = [];
  private recommendations: OptimizationRecommendation[] = [];
  private agentProfiles: Map<AgentId, AgentPerformanceProfile> = new Map();
  private taskTypeAnalyses: Map<TaskType, TaskTypeAnalysis> = new Map();
  private lastAnalysisTime: number = 0;
  private metrics: OptimizationMetrics;

  constructor(config: Partial<LearningOptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
  }

  /**
   * Add a task record for analysis
   */
  addTaskRecord(record: TaskHistoryRecord): void {
    this.history.push(record);

    // Trim to window size
    if (this.history.length > this.config.analysisWindowSize) {
      this.history = this.history.slice(-this.config.analysisWindowSize);
    }
  }

  /**
   * Analyze all data and generate recommendations
   */
  async analyze(): Promise<{
    patterns: TaskPattern[];
    recommendations: OptimizationRecommendation[];
    metrics: OptimizationMetrics;
  }> {
    if (this.history.length < this.config.minPatternSamples) {
      return {
        patterns: [],
        recommendations: [],
        metrics: this.metrics
      };
    }

    // Run analyses
    await this.detectPatterns();
    await this.analyzeTaskTypes();
    await this.analyzeAgentProfiles();
    await this.generateRecommendations();
    await this.calculateMetrics();

    this.lastAnalysisTime = Date.now();

    return {
      patterns: this.patterns,
      recommendations: this.getPendingRecommendations(),
      metrics: this.metrics
    };
  }

  /**
   * Get current optimization metrics
   */
  getMetrics(): OptimizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detected patterns
   */
  getPatterns(): TaskPattern[] {
    return [...this.patterns];
  }

  /**
   * Get all recommendations
   */
  getAllRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations];
  }

  /**
   * Get pending recommendations
   */
  getPendingRecommendations(): OptimizationRecommendation[] {
    return this.recommendations.filter(r => r.status === 'pending');
  }

  /**
   * Apply a recommendation
   */
  applyRecommendation(recommendationId: string): boolean {
    const rec = this.recommendations.find(r => r.id === recommendationId);
    if (!rec || rec.status !== 'pending') {
      return false;
    }

    rec.status = 'applied';
    rec.appliedAt = Date.now();
    
    return true;
  }

  /**
   * Reject a recommendation
   */
  rejectRecommendation(recommendationId: string, reason?: string): boolean {
    const rec = this.recommendations.find(r => r.id === recommendationId);
    if (!rec || rec.status !== 'pending') {
      return false;
    }

    rec.status = 'rejected';
    if (reason) {
      rec.details.rejectionReason = reason;
    }

    return true;
  }

  /**
   * Get agent performance profile
   */
  getAgentProfile(agentId: AgentId): AgentPerformanceProfile | undefined {
    return this.agentProfiles.get(agentId);
  }

  /**
   * Get task type analysis
   */
  getTaskTypeAnalysis(taskType: TaskType): TaskTypeAnalysis | undefined {
    return this.taskTypeAnalyses.get(taskType);
  }

  /**
   * Get aggregated statistics
   */
  getAggregatedStats(period: 'hour' | 'day' | 'week' | 'month'): AggregatedStats {
    const now = Date.now();
    let startTime: number;

    switch (period) {
      case 'hour':
        startTime = now - 60 * 60 * 1000;
        break;
      case 'day':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    const records = this.history.filter(r => r.createdAt >= startTime);
    const completed = records.filter(r => r.status === 'completed');
    const failed = records.filter(r => r.status === 'failed');

    // Calculate agent utilization
    const agentTasks = new Map<AgentId, number>();
    for (const r of records) {
      agentTasks.set(r.agentId, (agentTasks.get(r.agentId) ?? 0) + 1);
    }

    const agentUtilizations = Array.from(agentTasks.values());
    const avgAgentUtilization = agentUtilizations.length > 0
      ? agentUtilizations.reduce((s, c) => s + c, 0) / agentUtilizations.length
      : 0;

    // Find top and struggling agents
    const agentSuccessRates = new Map<AgentId, { success: number; total: number }>();
    for (const r of records) {
      const stats = agentSuccessRates.get(r.agentId) ?? { success: 0, total: 0 };
      stats.total++;
      if (r.status === 'completed') stats.success++;
      agentSuccessRates.set(r.agentId, stats);
    }

    const topPerformers = Array.from(agentSuccessRates.entries())
      .filter(([, s]) => s.total >= 3)
      .sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total))
      .slice(0, 5)
      .map(([agentId]) => agentId);

    const strugglingAgents = Array.from(agentSuccessRates.entries())
      .filter(([, s]) => s.total >= 3 && s.success / s.total < 0.7)
      .map(([agentId]) => agentId);

    return {
      period,
      startTime,
      endTime: now,
      tasksCompleted: completed.length,
      tasksFailed: failed.length,
      avgExecutionTime: completed.length > 0
        ? completed.reduce((s, r) => s + r.executionTime, 0) / completed.length
        : 0,
      avgQueueWaitTime: completed.length > 0
        ? completed.reduce((s, r) => s + r.queueWaitTime, 0) / completed.length
        : 0,
      avgAgentUtilization,
      topPerformers,
      strugglingAgents,
      predictionAccuracy: this.metrics.predictionAccuracy,
      predictionCount: records.filter(r => r.status === 'completed').length
    };
  }

  /**
   * Estimate wait time reduction from applying optimizations
   */
  estimateWaitTimeReduction(): number {
    const pendingRecs = this.getPendingRecommendations();
    if (pendingRecs.length === 0) return 0;

    const totalImprovement = pendingRecs
      .filter(r => r.type === 'task-routing' || r.type === 'timing-adjustment')
      .reduce((sum, r) => sum + r.expectedImprovement, 0);

    // Conservative estimate: 50% of projected improvement
    return totalImprovement * 0.5;
  }

  // ------------------------------------------------------------------------
  // Private Methods - Pattern Detection
  // ------------------------------------------------------------------------

  /**
   * Detect patterns in historical data
   */
  private async detectPatterns(): Promise<void> {
    this.patterns = [];

    // Time-of-day patterns
    await this.detectTimeOfDayPatterns();

    // Task sequence patterns
    await this.detectTaskSequencePatterns();

    // Agent preference patterns
    await this.detectAgentPreferencePatterns();

    // Load correlation patterns
    await this.detectLoadCorrelationPatterns();
  }

  /**
   * Detect time-of-day patterns
   */
  private async detectTimeOfDayPatterns(): Promise<void> {
    const hourStats = new Map<number, { count: number; avgTime: number; successRate: number }>();

    for (const record of this.history) {
      const hour = new Date(record.createdAt).getHours();
      const stats = hourStats.get(hour) ?? { count: 0, avgTime: 0, successRate: 0 };
      
      stats.count++;
      stats.avgTime = (stats.avgTime * (stats.count - 1) + record.executionTime) / stats.count;
      stats.successRate = (stats.successRate * (stats.count - 1) + (record.status === 'completed' ? 1 : 0)) / stats.count;
      
      hourStats.set(hour, stats);
    }

    // Find peak and low hours
    const hours = Array.from(hourStats.entries());
    if (hours.length < 4) return;

    const avgTime = hours.reduce((s, [, h]) => s + h.avgTime, 0) / hours.length;
    const avgSuccess = hours.reduce((s, [, h]) => s + h.successRate, 0) / hours.length;

    const peakHours = hours
      .filter(([, h]) => h.avgTime < avgTime * 0.85 && h.successRate > avgSuccess)
      .map(([h]) => h);

    const lowHours = hours
      .filter(([, h]) => h.avgTime > avgTime * 1.15 || h.successRate < avgSuccess * 0.85)
      .map(([h]) => h);

    if (peakHours.length > 0) {
      this.patterns.push({
        id: `time-peak-${Date.now()}`,
        type: 'time-of-day',
        description: `Peak performance hours detected: ${peakHours.map(h => `${h}:00`).join(', ')}`,
        confidence: 0.7 + (peakHours.length / 24) * 0.2,
        sampleCount: this.history.length,
        impact: 0.4,
        discoveredAt: Date.now(),
        data: { peakHours, avgTimeImprovement: 15 }
      });
    }

    if (lowHours.length > 0) {
      this.patterns.push({
        id: `time-low-${Date.now()}`,
        type: 'time-of-day',
        description: `Low performance hours detected: ${lowHours.map(h => `${h}:00`).join(', ')}`,
        confidence: 0.6 + (lowHours.length / 24) * 0.15,
        sampleCount: this.history.length,
        impact: 0.3,
        discoveredAt: Date.now(),
        data: { lowHours, avgTimeIncrease: 20 }
      });
    }
  }

  /**
   * Detect task sequence patterns
   */
  private async detectTaskSequencePatterns(): Promise<void> {
    // Group records by agent
    const agentRecords = new Map<AgentId, TaskHistoryRecord[]>();
    for (const record of this.history) {
      const records = agentRecords.get(record.agentId) ?? [];
      records.push(record);
      agentRecords.set(record.agentId, records);
    }

    // Look for patterns in task type sequences
    const typeTransitions = new Map<string, { count: number; avgTimeRatio: number }>();

    for (const [, records] of agentRecords) {
      for (let i = 1; i < records.length; i++) {
        const prev = records[i - 1];
        const curr = records[i];
        const key = `${prev.taskType}->${curr.taskType}`;
        
        const transition = typeTransitions.get(key) ?? { count: 0, avgTimeRatio: 1 };
        const timeRatio = curr.executionTime / (curr.executionTime + prev.executionTime);
        
        transition.count++;
        transition.avgTimeRatio = (transition.avgTimeRatio * (transition.count - 1) + timeRatio) / transition.count;
        
        typeTransitions.set(key, transition);
      }
    }

    // Find significant patterns
    const significantTransitions = Array.from(typeTransitions.entries())
      .filter(([, t]) => t.count >= 5 && (t.avgTimeRatio < 0.8 || t.avgTimeRatio > 1.2));

    for (const [transition, data] of significantTransitions) {
      this.patterns.push({
        id: `sequence-${transition.replace(/->/g, '-')}`,
        type: 'task-sequence',
        description: `Task sequence pattern: ${transition} shows ${data.avgTimeRatio < 1 ? 'faster' : 'slower'} completion`,
        confidence: Math.min(0.9, 0.5 + data.count / 20),
        sampleCount: data.count,
        impact: Math.abs(1 - data.avgTimeRatio) * 0.5,
        discoveredAt: Date.now(),
        data: { transition, timeRatio: data.avgTimeRatio }
      });
    }
  }

  /**
   * Detect agent preference patterns
   */
  private async detectAgentPreferencePatterns(): Promise<void> {
    const agentTaskStats = new Map<AgentId, Map<TaskType, { count: number; avgTime: number; success: number }>>();

    for (const record of this.history) {
      let taskStats = agentTaskStats.get(record.agentId);
      if (!taskStats) {
        taskStats = new Map();
        agentTaskStats.set(record.agentId, taskStats);
      }

      const stats = taskStats.get(record.taskType) ?? { count: 0, avgTime: 0, success: 0 };
      stats.count++;
      stats.avgTime = (stats.avgTime * (stats.count - 1) + record.executionTime) / stats.count;
      stats.success += record.status === 'completed' ? 1 : 0;
      
      taskStats.set(record.taskType, stats);
    }

    // Find agents with strong preferences
    for (const [agentId, taskStats] of agentTaskStats) {
      const stats = Array.from(taskStats.entries());
      if (stats.length < 2) continue;

      const avgTime = stats.reduce((s, [, t]) => s + t.avgTime, 0) / stats.length;
      const avgSuccess = stats.reduce((s, [, t]) => s + t.success / t.count, 0) / stats.length;

      // Find strengths (better than average)
      const strengths = stats
        .filter(([, t]) => t.count >= 3 && t.avgTime < avgTime * 0.85 && (t.success / t.count) > avgSuccess)
        .map(([type]) => type);

      // Find weaknesses (worse than average)
      const weaknesses = stats
        .filter(([, t]) => t.count >= 3 && t.avgTime > avgTime * 1.15 && (t.success / t.count) < avgSuccess)
        .map(([type]) => type);

      if (strengths.length > 0 || weaknesses.length > 0) {
        this.patterns.push({
          id: `agent-pref-${agentId}`,
          type: 'agent-preference',
          description: `Agent ${agentId} shows preference: strengths [${strengths.join(', ')}], weaknesses [${weaknesses.join(', ')}]`,
          confidence: 0.6 + (strengths.length + weaknesses.length) * 0.1,
          sampleCount: stats.reduce((s, [, t]) => s + t.count, 0),
          impact: Math.max(strengths.length, weaknesses.length) * 0.2,
          discoveredAt: Date.now(),
          data: { agentId, strengths, weaknesses }
        });
      }
    }
  }

  /**
   * Detect load correlation patterns
   */
  private async detectLoadCorrelationPatterns(): Promise<void> {
    const loadBuckets = new Map<number, { count: number; avgTime: number; success: number }>();
    
    // Bucket load levels (0-0.2, 0.2-0.4, etc.)
    for (const record of this.history) {
      const loadBucket = Math.floor(record.agentLoadAtStart * 5) / 5; // 0, 0.2, 0.4, etc.
      const stats = loadBuckets.get(loadBucket) ?? { count: 0, avgTime: 0, success: 0 };
      
      stats.count++;
      stats.avgTime = (stats.avgTime * (stats.count - 1) + record.executionTime) / stats.count;
      stats.success += record.status === 'completed' ? 1 : 0;
      
      loadBuckets.set(loadBucket, stats);
    }

    // Find optimal load range
    const buckets = Array.from(loadBuckets.entries());
    if (buckets.length < 2) return;

    const bestBucket = buckets
      .filter(([, b]) => b.count >= 5)
      .sort((a, b) => {
        // Score by time and success rate
        const scoreA = a[1].success / a[1].count - a[1].avgTime / 1000;
        const scoreB = b[1].success / b[1].count - b[1].avgTime / 1000;
        return scoreB - scoreA;
      })[0];

    if (bestBucket) {
      this.patterns.push({
        id: `load-optimal`,
        type: 'load-correlation',
        description: `Optimal load range: ${bestBucket[0] * 100}%-${(bestBucket[0] + 0.2) * 100}%`,
        confidence: 0.6 + bestBucket[1].count / 50,
        sampleCount: bestBucket[1].count,
        impact: 0.3,
        discoveredAt: Date.now(),
        data: { 
          optimalLoadRange: [bestBucket[0], bestBucket[0] + 0.2],
          avgTimeAtOptimal: bestBucket[1].avgTime,
          successRateAtOptimal: bestBucket[1].success / bestBucket[1].count
        }
      });
    }
  }

  // ------------------------------------------------------------------------
  // Private Methods - Analysis
  // ------------------------------------------------------------------------

  /**
   * Analyze task types
   */
  private async analyzeTaskTypes(): Promise<void> {
    this.taskTypeAnalyses.clear();

    const taskTypeRecords = new Map<TaskType, TaskHistoryRecord[]>();
    for (const record of this.history) {
      const records = taskTypeRecords.get(record.taskType) ?? [];
      records.push(record);
      taskTypeRecords.set(record.taskType, records);
    }

    for (const [taskType, records] of taskTypeRecords) {
      const completed = records.filter(r => r.status === 'completed');
      
      if (completed.length < 3) continue;

      const avgCompletionTime = completed.reduce((s, r) => s + r.executionTime, 0) / completed.length;
      const avgQueueWaitTime = completed.reduce((s, r) => s + r.queueWaitTime, 0) / completed.length;
      const successRate = completed.length / records.length;

      // Find best and worst agents for this task type
      const agentStats = new Map<AgentId, { times: number[]; successes: number }>();
      for (const r of completed) {
        const stats = agentStats.get(r.agentId) ?? { times: [], successes: 0 };
        stats.times.push(r.executionTime);
        stats.successes += r.status === 'completed' ? 1 : 0;
        agentStats.set(r.agentId, stats);
      }

      const agentRankings = Array.from(agentStats.entries())
        .filter(([, s]) => s.times.length >= 2)
        .map(([agentId, s]) => ({
          agentId,
          avgTime: s.times.reduce((a, b) => a + b, 0) / s.times.length,
          successRate: s.successes / s.times.length
        }))
        .sort((a, b) => a.avgTime - b.avgTime);

      const bestAgents = agentRankings.slice(0, 3);
      const worstAgents = agentRankings.slice(-3).reverse();

      // Peak hours for this task type
      const hourCounts = new Map<number, number>();
      for (const r of records) {
        const hour = new Date(r.createdAt).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      }
      const peakHours = Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([h]) => h);

      // Bottleneck probability
      const bottleneckProbability = avgQueueWaitTime > avgCompletionTime * 0.5 ? 0.7 : 0.3;

      // Recommended optimizations
      const recommendedOptimizations: string[] = [];
      if (avgQueueWaitTime > 30) {
        recommendedOptimizations.push('Increase agent capacity for this task type');
      }
      if (successRate < 0.85) {
        recommendedOptimizations.push('Review task requirements and agent capabilities');
      }
      if (worstAgents.length > 0 && bestAgents.length > 0) {
        const timeDiff = worstAgents[0].avgTime - bestAgents[0].avgTime;
        if (timeDiff > avgCompletionTime * 0.3) {
          recommendedOptimizations.push('Route more tasks to best-performing agents');
        }
      }

      this.taskTypeAnalyses.set(taskType, {
        taskType,
        totalCount: records.length,
        avgCompletionTime,
        avgQueueWaitTime,
        successRate,
        bestAgents,
        worstAgents,
        peakHours,
        bottleneckProbability,
        recommendedOptimizations
      });
    }
  }

  /**
   * Analyze agent profiles
   */
  private async analyzeAgentProfiles(): Promise<void> {
    this.agentProfiles.clear();

    const agentRecords = new Map<AgentId, TaskHistoryRecord[]>();
    for (const record of this.history) {
      const records = agentRecords.get(record.agentId) ?? [];
      records.push(record);
      agentRecords.set(record.agentId, records);
    }

    for (const [agentId, records] of agentRecords) {
      if (records.length < 5) continue;

      const completed = records.filter(r => r.status === 'completed');
      const avgTime = completed.reduce((s, r) => s + r.executionTime, 0) / completed.length;
      
      // Find strengths and weaknesses
      const typeStats = new Map<TaskType, { avgTime: number; count: number }>();
      for (const r of completed) {
        const stats = typeStats.get(r.taskType) ?? { avgTime: 0, count: 0 };
        stats.count++;
        stats.avgTime = (stats.avgTime * (stats.count - 1) + r.executionTime) / stats.count;
        typeStats.set(r.taskType, stats);
      }

      const overallAvg = avgTime;
      const strengths: TaskType[] = [];
      const weaknesses: TaskType[] = [];

      for (const [type, stats] of typeStats) {
        if (stats.count < 2) continue;
        if (stats.avgTime < overallAvg * 0.85) {
          strengths.push(type);
        } else if (stats.avgTime > overallAvg * 1.15) {
          weaknesses.push(type);
        }
      }

      // Find optimal load
      const loadTimes = records.map(r => ({ load: r.agentLoadAtStart, time: r.executionTime }));
      loadTimes.sort((a, b) => a.load - b.load);
      
      let optimalLoad = 0.5;
      if (loadTimes.length >= 10) {
        const mid = Math.floor(loadTimes.length / 2);
        const lowerHalf = loadTimes.slice(0, mid);
        const upperHalf = loadTimes.slice(mid);
        
        const lowerAvg = lowerHalf.reduce((s, l) => s + l.time, 0) / lowerHalf.length;
        const upperAvg = upperHalf.reduce((s, l) => s + l.time, 0) / upperHalf.length;
        
        optimalLoad = lowerAvg < upperAvg ? 0.3 : 0.7;
      }

      // Peak hours
      const hourStats = new Map<number, number[]>();
      for (const r of completed) {
        const hour = new Date(r.createdAt).getHours();
        const times = hourStats.get(hour) ?? [];
        times.push(r.executionTime);
        hourStats.set(hour, times);
      }

      const overallAvgTime = avgTime;
      const peakHours = Array.from(hourStats.entries())
        .filter(([, times]) => {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          return avg < overallAvgTime * 0.9;
        })
        .map(([h]) => h);

      // Calculate consistency (lower variance = more consistent)
      const times = completed.map(r => r.executionTime);
      const variance = times.reduce((s, t) => s + Math.pow(t - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      const consistency = Math.max(0, 1 - stdDev / avgTime);

      // Calculate trend
      const recent = completed.slice(-10);
      const older = completed.slice(0, -10);
      
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (older.length >= 5 && recent.length >= 5) {
        const recentAvg = recent.reduce((s, r) => s + r.executionTime, 0) / recent.length;
        const olderAvg = older.reduce((s, r) => s + r.executionTime, 0) / older.length;
        
        if (recentAvg < olderAvg * 0.9) {
          trend = 'improving';
        } else if (recentAvg > olderAvg * 1.1) {
          trend = 'declining';
        }
      }

      this.agentProfiles.set(agentId, {
        agentId,
        strengths,
        weaknesses,
        optimalLoad,
        peakHours,
        avgWaitTimeReduction: 0, // Would need baseline to calculate
        consistency,
        trend
      });
    }
  }

  /**
   * Generate optimization recommendations
   */
  private async generateRecommendations(): Promise<void> {
    // Keep existing applied/rejected, clear pending
    this.recommendations = this.recommendations.filter(r => r.status !== 'pending');

    // Generate from patterns
    for (const pattern of this.patterns) {
      if (pattern.confidence < this.config.recommendationThreshold) continue;

      switch (pattern.type) {
        case 'agent-preference':
          this.generateAgentPreferenceRecommendation(pattern);
          break;
        case 'time-of-day':
          this.generateTimingRecommendation(pattern);
          break;
        case 'load-correlation':
          this.generateLoadRecommendation(pattern);
          break;
        case 'task-sequence':
          this.generateSequenceRecommendation(pattern);
          break;
      }
    }

    // Generate from task type analyses
    for (const [, analysis] of this.taskTypeAnalyses) {
      if (analysis.recommendedOptimizations.length > 0) {
        this.recommendations.push({
          id: `task-opt-${analysis.taskType}-${Date.now()}`,
          type: 'task-routing',
          priority: analysis.bottleneckProbability > 0.5 ? 'high' : 'medium',
          description: `Optimize ${analysis.taskType} routing: ${analysis.recommendedOptimizations[0]}`,
          expectedImprovement: analysis.avgQueueWaitTime * 0.3,
          affectedAgents: analysis.bestAgents.map(a => a.agentId),
          affectedTaskTypes: [analysis.taskType],
          createdAt: Date.now(),
          status: 'pending',
          details: { analysis }
        });
      }
    }
  }

  private generateAgentPreferenceRecommendation(pattern: TaskPattern): void {
    const { agentId, strengths, weaknesses } = pattern.data as {
      agentId: AgentId;
      strengths: TaskType[];
      weaknesses: TaskType[];
    };

    if (strengths.length > 0) {
      this.recommendations.push({
        id: `weight-${agentId}-strengths`,
        type: 'weight-adjustment',
        priority: 'medium',
        description: `Increase weight for agent ${agentId} on task types: ${strengths.join(', ')}`,
        expectedImprovement: 10,
        affectedAgents: [agentId],
        affectedTaskTypes: strengths,
        createdAt: Date.now(),
        status: 'pending',
        details: { adjustment: 0.2, reason: 'strength-based' }
      });
    }

    if (weaknesses.length > 0) {
      this.recommendations.push({
        id: `weight-${agentId}-weaknesses`,
        type: 'weight-adjustment',
        priority: 'low',
        description: `Decrease weight for agent ${agentId} on task types: ${weaknesses.join(', ')}`,
        expectedImprovement: 5,
        affectedAgents: [agentId],
        affectedTaskTypes: weaknesses,
        createdAt: Date.now(),
        status: 'pending',
        details: { adjustment: -0.2, reason: 'weakness-based' }
      });
    }
  }

  private generateTimingRecommendation(pattern: TaskPattern): void {
    const { peakHours, lowHours } = pattern.data as {
      peakHours?: number[];
      lowHours?: number[];
    };

    if (peakHours && peakHours.length > 0) {
      this.recommendations.push({
        id: `timing-peak`,
        type: 'timing-adjustment',
        priority: 'low',
        description: `Schedule critical tasks during peak hours: ${peakHours.map(h => `${h}:00`).join(', ')}`,
        expectedImprovement: 15,
        affectedAgents: [],
        affectedTaskTypes: [],
        createdAt: Date.now(),
        status: 'pending',
        details: { peakHours }
      });
    }

    if (lowHours && lowHours.length > 0) {
      this.recommendations.push({
        id: `timing-low`,
        type: 'timing-adjustment',
        priority: 'low',
        description: `Avoid scheduling critical tasks during low performance hours: ${lowHours.map(h => `${h}:00`).join(', ')}`,
        expectedImprovement: 10,
        affectedAgents: [],
        affectedTaskTypes: [],
        createdAt: Date.now(),
        status: 'pending',
        details: { lowHours }
      });
    }
  }

  private generateLoadRecommendation(pattern: TaskPattern): void {
    const { optimalLoadRange } = pattern.data as {
      optimalLoadRange: [number, number];
    };

    this.recommendations.push({
      id: `load-optimal`,
      type: 'capacity-change',
      priority: 'medium',
      description: `Maintain agent load between ${(optimalLoadRange[0] * 100).toFixed(0)}% and ${(optimalLoadRange[1] * 100).toFixed(0)}% for optimal performance`,
      expectedImprovement: 12,
      affectedAgents: [],
      affectedTaskTypes: [],
      createdAt: Date.now(),
      status: 'pending',
      details: { optimalLoadRange }
    });
  }

  private generateSequenceRecommendation(pattern: TaskPattern): void {
    const { transition, timeRatio } = pattern.data as {
      transition: string;
      timeRatio: number;
    };

    if (timeRatio < 1) {
      this.recommendations.push({
        id: `sequence-${transition.replace(/->/g, '-')}`,
        type: 'task-routing',
        priority: 'low',
        description: `Consider batching task sequence: ${transition} (shows ${(timeRatio * 100).toFixed(0)}% time improvement)`,
        expectedImprovement: (1 - timeRatio) * 15,
        affectedAgents: [],
        affectedTaskTypes: [],
        createdAt: Date.now(),
        status: 'pending',
        details: { transition, timeRatio }
      });
    }
  }

  /**
   * Calculate overall metrics
   */
  private async calculateMetrics(): Promise<void> {
    const completed = this.history.filter(r => r.status === 'completed');
    
    if (completed.length === 0) {
      this.metrics = this.initializeMetrics();
      return;
    }

    // Basic metrics
    this.metrics.avgQueueWaitTime = completed.reduce((s, r) => s + r.queueWaitTime, 0) / completed.length;
    this.metrics.avgCompletionTime = completed.reduce((s, r) => s + r.executionTime, 0) / completed.length;

    // Throughput
    const timeRange = Math.max(...this.history.map(r => r.createdAt)) - 
                      Math.min(...this.history.map(r => r.createdAt));
    const hours = Math.max(1, timeRange / (60 * 60 * 1000));
    this.metrics.throughputPerHour = completed.length / hours;

    // Agent utilization variance
    const agentUtilizations = new Map<AgentId, number>();
    for (const r of this.history) {
      agentUtilizations.set(r.agentId, (agentUtilizations.get(r.agentId) ?? 0) + 1);
    }
    const utils = Array.from(agentUtilizations.values());
    const avgUtil = utils.reduce((s, u) => s + u, 0) / utils.length;
    this.metrics.agentUtilizationVariance = utils.reduce((s, u) => s + Math.pow(u - avgUtil, 2), 0) / utils.length;

    // Load balance score (lower variance = better balance)
    this.metrics.loadBalanceScore = Math.max(0, 1 - this.metrics.agentUtilizationVariance / avgUtil);

    // Prediction accuracy (would need prediction data)
    // Placeholder for future prediction accuracy tracking
    this.metrics.predictionAccuracy = 0;
  }
}