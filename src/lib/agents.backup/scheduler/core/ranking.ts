/**
 * Task Ranking Algorithm
 * Ranks and orders tasks based on priority, deadlines, and dependencies
 */

import { Task, TaskPriority, PRIORITY_WEIGHTS } from '../models/task-model';

/**
 * Ranked task with score and reasoning
 */
export interface RankedTask {
  task: Task;
  score: number;
  priority: number;
  urgency: number;
  dependencyScore: number;
  ageScore: number;
}

/**
 * Task ranking for determining scheduling order
 */
export class TaskRanker {
  private now: number;

  constructor() {
    this.now = Date.now();
  }

  /**
   * Update current time (useful for testing)
   */
  setCurrentTime(time: number): void {
    this.now = time;
  }

  /**
   * Rank tasks in order of scheduling priority
   */
  rankTasks(tasks: Task[]): RankedTask[] {
    const ranked = tasks.map(task => this.calculateTaskScore(task));

    // Sort by total score (highest first)
    ranked.sort((a, b) => b.score - a.score);

    return ranked;
  }

  /**
   * Calculate priority score for a task
   */
  private calculatePriorityScore(task: Task): number {
    // Base priority weight
    let score = PRIORITY_WEIGHTS[task.priority] * 25;

    // Urgent tasks get extra boost
    if (task.priority === 'urgent') {
      score += 25;
    }

    return score;
  }

  /**
   * Calculate urgency score based on deadline
   */
  private calculateUrgencyScore(task: Task): number {
    if (!task.deadline) {
      return 0; // No deadline = no urgency
    }

    const timeUntilDeadline = task.deadline - this.now;
    
    if (timeUntilDeadline <= 0) {
      return 100; // Overdue - maximum urgency
    }

    // Calculate urgency based on time remaining
    // 1 hour = 100, 24 hours = 50, 1 week = 0
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    if (timeUntilDeadline < oneHour) {
      return 100;
    } else if (timeUntilDeadline < oneDay) {
      return 50 + ((oneDay - timeUntilDeadline) / oneDay) * 50;
    } else if (timeUntilDeadline < oneWeek) {
      return ((oneWeek - timeUntilDeadline) / (oneWeek - oneDay)) * 50;
    } else {
      return 0;
    }
  }

  /**
   * Calculate dependency score
   * Tasks with fewer dependencies should be scheduled first
   */
  private calculateDependencyScore(task: Task): number {
    const depCount = task.dependencies.length;
    
    // Inverse relationship: fewer dependencies = higher score
    if (depCount === 0) {
      return 100;
    } else if (depCount === 1) {
      return 70;
    } else if (depCount <= 3) {
      return 40;
    } else {
      return 20;
    }
  }

  /**
   * Calculate age score
   * Older tasks should be scheduled first
   */
  private calculateAgeScore(task: Task): number {
    const age = this.now - task.createdAt;
    
    // 1 hour old = 0, 1 day old = 50, 1 week old = 100
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    if (age < oneHour) {
      return 0;
    } else if (age < oneDay) {
      return ((age - oneHour) / (oneDay - oneHour)) * 50;
    } else if (age < oneWeek) {
      return 50 + ((age - oneDay) / (oneWeek - oneDay)) * 50;
    } else {
      return 100;
    }
  }

  /**
   * Calculate total score for a task
   */
  private calculateTaskScore(task: Task): RankedTask {
    const priority = this.calculatePriorityScore(task);
    const urgency = this.calculateUrgencyScore(task);
    const dependencyScore = this.calculateDependencyScore(task);
    const ageScore = this.calculateAgeScore(task);

    // Weighted total score
    const total = 
      priority * 0.4 +      // 40% weight on priority
      urgency * 0.3 +        // 30% weight on urgency
      dependencyScore * 0.2 + // 20% weight on dependencies
      ageScore * 0.1;        // 10% weight on age

    return {
      task,
      score: total,
      priority,
      urgency,
      dependencyScore,
      ageScore
    };
  }

  /**
   * Get N highest priority tasks
   */
  getTopTasks(tasks: Task[], count: number): Task[] {
    const ranked = this.rankTasks(tasks);
    return ranked.slice(0, count).map(r => r.task);
  }

  /**
   * Filter tasks that can be scheduled now
   * (dependencies satisfied and ready)
   */
  getReadyTasks(tasks: Task[]): Task[] {
    return tasks.filter(task => this.isTaskReady(task));
  }

  /**
   * Check if task is ready to be scheduled
   */
  private isTaskReady(task: Task): boolean {
    // Task must be pending
    if (task.status !== 'pending') {
      return false;
    }

    // Dependencies must be satisfied
    if (task.dependencies.length > 0) {
      // This requires access to task queue in real implementation
      // For now, assume unsatisfied dependencies mean not ready
      return false;
    }

    return true;
  }

  /**
   * Get tasks by priority level
   */
  getTasksByPriority(tasks: Task[], priority: TaskPriority): Task[] {
    return tasks.filter(task => task.priority === priority);
  }

  /**
   * Get overdue tasks
   */
  getOverdueTasks(tasks: Task[]): Task[] {
    return tasks.filter(task => 
      task.deadline && 
      task.deadline < this.now && 
      task.status !== 'completed' && 
      task.status !== 'cancelled'
    );
  }

  /**
   * Get tasks due within time window
   */
  getTasksDueWithin(tasks: Task[], windowMs: number): Task[] {
    const deadlineThreshold = this.now + windowMs;
    
    return tasks.filter(task => 
      task.deadline && 
      task.deadline <= deadlineThreshold &&
      task.status !== 'completed' &&
      task.status !== 'cancelled'
    );
  }

  /**
   * Sort tasks by deadline
   */
  sortByDeadline(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline - b.deadline;
    });
  }

  /**
   * Sort tasks by priority
   */
  sortByPriority(tasks: Task[]): Task[] {
    const priorityOrder: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];
    
    return [...tasks].sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.priority);
      const bIndex = priorityOrder.indexOf(b.priority);
      return aIndex - bIndex;
    });
  }

  /**
   * Sort tasks by creation time
   */
  sortByCreationTime(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Group tasks by priority
   */
  groupByPriority(tasks: Task[]): Map<TaskPriority, Task[]> {
    const groups = new Map<TaskPriority, Task[]>();
    
    for (const task of tasks) {
      const existing = groups.get(task.priority) || [];
      existing.push(task);
      groups.set(task.priority, existing);
    }
    
    return groups;
  }

  /**
   * Get task statistics
   */
  getTaskStats(tasks: Task[]): {
    total: number;
    byPriority: Record<TaskPriority, number>;
    byStatus: Record<string, number>;
    overdue: number;
    averageAge: number;
  } {
    const stats = {
      total: tasks.length,
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      },
      byStatus: {} as Record<string, number>,
      overdue: 0,
      averageAge: 0
    };

    let totalAge = 0;

    for (const task of tasks) {
      // Count by priority
      stats.byPriority[task.priority]++;
      
      // Count by status
      stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
      
      // Count overdue
      if (task.deadline && task.deadline < this.now && 
          task.status !== 'completed' && task.status !== 'cancelled') {
        stats.overdue++;
      }
      
      // Calculate age
      totalAge += this.now - task.createdAt;
    }

    stats.averageAge = tasks.length > 0 ? totalAge / tasks.length : 0;

    return stats;
  }
}
