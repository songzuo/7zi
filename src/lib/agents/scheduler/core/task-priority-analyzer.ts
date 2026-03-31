/**
 * @fileoverview Task Priority Analyzer - Automatic task priority assessment
 * @description Analyzes tasks and suggests priorities based on type, deadline, and assignee load
 * 
 * @merged_from src/lib/agent/TaskPriorityAnalyzer.ts (archive backup)
 * @date 2026-03-30 - Sprint 3 lib/ layer refactoring
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Task type categories for priority calculation
 */
export type TaskCategory = 'BUG' | 'FEATURE' | 'REFACTOR' | 'DOCS' | 'TEST' | 'OTHER';

/**
 * Priority levels for task classification
 */
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

/**
 * Task data required for priority analysis
 */
export interface TaskData {
  /** Unique task identifier */
  id: string;
  /** Task title or description */
  title: string;
  /** Task type (bug, feature, etc.) */
  type: TaskCategory;
  /** ISO format deadline date string */
  deadline?: string;
  /** Assignee user ID */
  assigneeId?: string;
  /** Current number of in-progress tasks for the assignee */
  assigneeInProgressCount?: number;
  /** Additional metadata for custom rules */
  metadata?: Record<string, unknown>;
}

/**
 * Priority suggestion result
 */
export interface PrioritySuggestion {
  /** Suggested priority level */
  priority: PriorityLevel;
  /** Priority score from 0 to 10 */
  score: number;
  /** Reasoning explaining the priority decision */
  reasoning: string[];
  /** Recommended deadline (ISO date) if current deadline is not optimal */
  recommendedDeadline?: string;
}

/**
 * Priority calculation rules configuration
 */
export interface PriorityRulesConfig {
  /** Hours threshold for urgent priority */
  urgentHoursThreshold: number;
  /** Hours threshold for high priority */
  highHoursThreshold: number;
  /** Hours threshold for medium priority */
  mediumHoursThreshold: number;
  /** Number of in-progress tasks that triggers load bonus */
  highLoadThreshold: number;
  /** Priority score bonus for high load assignees */
  highLoadBonus: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default priority rules configuration
 */
export const DEFAULT_PRIORITY_RULES: PriorityRulesConfig = {
  urgentHoursThreshold: 24,
  highHoursThreshold: 72, // 3 days
  mediumHoursThreshold: 168, // 7 days
  highLoadThreshold: 5,
  highLoadBonus: 1,
} as const;

// ============================================================================
// Priority Analyzer Class
// ============================================================================

/**
 * Task Priority Analyzer - Analyzes tasks and suggests priorities
 *
 * This class provides rule-based priority assessment for tasks based on:
 * - Time until deadline
 * - Task type (bugs are higher priority)
 * - Assignee's current workload
 *
 * @example
 * ```typescript
 * const analyzer = new TaskPriorityAnalyzer();
 * const suggestion = analyzer.analyzePriority({
 *   id: 'task-1',
 *   title: 'Fix login bug',
 *   type: 'BUG',
 *   deadline: '2026-03-22T12:00:00Z',
 *   assigneeId: 'user-1',
 *   assigneeInProgressCount: 6,
 * });
 * ```
 */
export class TaskPriorityAnalyzer {
  private config: PriorityRulesConfig;

  /**
   * Creates a new TaskPriorityAnalyzer instance
   * @param config - Priority rules configuration (uses defaults if not provided)
   */
  constructor(config?: Partial<PriorityRulesConfig>) {
    this.config = { ...DEFAULT_PRIORITY_RULES, ...config };
  }

  /**
   * Analyzes a task and returns priority suggestion
   * @param task - Task data to analyze
   * @param referenceDate - Reference date for deadline calculation (defaults to now)
   * @returns Priority suggestion with reasoning
   */
  analyzePriority(task: TaskData, referenceDate?: Date): PrioritySuggestion {
    const now = referenceDate || new Date();
    const reasoning: string[] = [];

    // Calculate base priority from deadline
    const deadlineScore = this.calculateDeadlineScore(task.deadline, now);
    reasoning.push(...deadlineScore.reasoning);

    // Calculate task type bonus
    const typeScore = this.calculateTypeScore(task.type);
    reasoning.push(...typeScore.reasoning);

    // Calculate assignee load bonus
    const loadScore = this.calculateLoadScore(task.assigneeInProgressCount);
    reasoning.push(...loadScore.reasoning);

    // Combine scores
    let totalScore = deadlineScore.score + typeScore.score + loadScore.score;

    // Clamp score to 0-10 range
    totalScore = Math.max(0, Math.min(10, totalScore));

    // Determine priority level
    const priority = this.scoreToPriority(totalScore);

    return {
      priority,
      score: totalScore,
      reasoning,
    };
  }

  /**
   * Calculates priority score based on deadline proximity
   * @param deadline - ISO format deadline date string
   * @param now - Reference date for calculation
   * @returns Score and reasoning
   */
  private calculateDeadlineScore(
    deadline: string | undefined,
    now: Date
  ): { score: number; reasoning: string[] } {
    const reasoning: string[] = [];

    if (!deadline) {
      reasoning.push('No deadline specified - using neutral score');
      return { score: 5, reasoning };
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      reasoning.push('Invalid deadline format - using neutral score');
      return { score: 5, reasoning };
    }

    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeadline < 0) {
      reasoning.push('Task is overdue - maximum priority');
      return { score: 10, reasoning };
    }

    if (hoursUntilDeadline < this.config.urgentHoursThreshold) {
      reasoning.push(
        `Deadline in ${Math.round(hoursUntilDeadline)} hours (< ${this.config.urgentHoursThreshold}h) - urgent priority`
      );
      return { score: 9, reasoning };
    }

    if (hoursUntilDeadline < this.config.highHoursThreshold) {
      reasoning.push(
        `Deadline in ${Math.round(hoursUntilDeadline)} hours (< ${this.config.highHoursThreshold}h) - high priority`
      );
      return { score: 7, reasoning };
    }

    if (hoursUntilDeadline < this.config.mediumHoursThreshold) {
      reasoning.push(
        `Deadline in ${Math.round(hoursUntilDeadline / 24)} days (< ${this.config.mediumHoursThreshold / 24}d) - medium priority`
      );
      return { score: 5, reasoning };
    }

    reasoning.push(
      `Deadline in ${Math.round(hoursUntilDeadline / 24)} days - lower urgency`
    );
    return { score: 2, reasoning };
  }

  /**
   * Calculates priority bonus based on task type
   * @param type - Task type
   * @returns Score bonus and reasoning
   */
  private calculateTypeScore(type: TaskCategory): { score: number; reasoning: string[] } {
    const reasoning: string[] = [];

    switch (type) {
      case 'BUG':
        reasoning.push('BUG type - highest importance (+2)');
        return { score: 2, reasoning };

      case 'FEATURE':
        reasoning.push('FEATURE type - moderate importance (+1)');
        return { score: 1, reasoning };

      case 'REFACTOR':
        reasoning.push('REFACTOR type - neutral priority');
        return { score: 0, reasoning };

      case 'DOCS':
        reasoning.push('DOCS type - lower priority (-1)');
        return { score: -1, reasoning };

      case 'TEST':
        reasoning.push('TEST type - neutral priority');
        return { score: 0, reasoning };

      default:
        reasoning.push('OTHER type - neutral priority');
        return { score: 0, reasoning };
    }
  }

  /**
   * Calculates priority bonus based on assignee workload
   * @param inProgressCount - Number of in-progress tasks for assignee
   * @returns Score bonus and reasoning
   */
  private calculateLoadScore(
    inProgressCount: number | undefined
  ): { score: number; reasoning: string[] } {
    const reasoning: string[] = [];

    if (inProgressCount === undefined) {
      reasoning.push('Assignee workload unknown - no load adjustment');
      return { score: 0, reasoning };
    }

    if (inProgressCount > this.config.highLoadThreshold) {
      reasoning.push(
        `Assignee has ${inProgressCount} in-progress tasks (>${this.config.highLoadThreshold}) - priority increased`
      );
      return { score: this.config.highLoadBonus, reasoning };
    }

    reasoning.push(`Assignee has ${inProgressCount} in-progress tasks - normal load`);
    return { score: 0, reasoning };
  }

  /**
   * Converts a numeric score to a priority level
   * @param score - Priority score (0-10)
   * @returns Priority level
   */
  private scoreToPriority(score: number): PriorityLevel {
    if (score >= 8) return 'urgent';
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * Analyzes multiple tasks and returns priority suggestions
   * @param tasks - Array of task data to analyze
   * @param referenceDate - Reference date for deadline calculation
   * @returns Array of priority suggestions
   */
  analyzePriorities(
    tasks: TaskData[],
    referenceDate?: Date
  ): Array<{ taskId: string } & PrioritySuggestion> {
    return tasks.map((task) => ({
      taskId: task.id,
      ...this.analyzePriority(task, referenceDate),
    }));
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a default TaskPriorityAnalyzer instance with standard rules
 * @returns Configured TaskPriorityAnalyzer instance
 */
export function createPriorityAnalyzer(): TaskPriorityAnalyzer {
  return new TaskPriorityAnalyzer();
}

/**
 * Analyzes a single task with default analyzer configuration
 * @param task - Task data to analyze
 * @param referenceDate - Reference date for deadline calculation
 * @returns Priority suggestion
 */
export function analyzeTaskPriority(
  task: TaskData,
  referenceDate?: Date
): PrioritySuggestion {
  const analyzer = createPriorityAnalyzer();
  return analyzer.analyzePriority(task, referenceDate);
}

/**
 * Analyzes multiple tasks with default analyzer configuration
 * @param tasks - Array of task data to analyze
 * @param referenceDate - Reference date for deadline calculation
 * @returns Array of priority suggestions with task IDs
 */
export function analyzeTasksPriority(
  tasks: TaskData[],
  referenceDate?: Date
): Array<{ taskId: string } & PrioritySuggestion> {
  const analyzer = createPriorityAnalyzer();
  return analyzer.analyzePriorities(tasks, referenceDate);
}
