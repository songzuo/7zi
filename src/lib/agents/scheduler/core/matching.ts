/**
 * Task Matching Algorithm
 * Finds candidate agents capable of handling a task
 */

import { AgentCapability } from '../models/agent-capability';
import { Task } from '../models/task-model';
import { AgentProvider } from '../models/agent-capability';

/**
 * Task matching result with confidence score
 */
export interface MatchResult {
  agentId: string;
  agentName: string;
  confidence: number;
  reasons: string[];
}

/**
 * Task matcher for finding suitable agents
 */
export class TaskMatcher {
  /**
   * Find all agents capable of handling a task
   */
  findCandidates(task: Task, agents: Map<string, AgentCapability>): AgentCapability[] {
    const candidates: AgentCapability[] = [];

    for (const [agentId, agent] of agents.entries()) {
      if (this.canHandleTask(agent, task)) {
        candidates.push(agent);
      }
    }

    return candidates;
  }

  /**
   * Check if an agent can handle a task
   */
  canHandleTask(agent: AgentCapability, task: Task): boolean {
    // Check availability
    if (!agent.availability) {
      return false;
    }

    // Check if task type is in agent's capabilities
    if (!agent.capabilities.taskTypes.includes(task.type)) {
      return false;
    }

    // Check if agent has required capabilities
    if (!this.hasRequiredCapabilities(agent, task.requiredCapabilities)) {
      return false;
    }

    // Check if agent has capacity
    if (!this.checkLoadCapacity(agent, task)) {
      return false;
    }

    return true;
  }

  /**
   * Check if agent has required technical capabilities
   */
  private hasRequiredCapabilities(agent: AgentCapability, required: string[]): boolean {
    if (required.length === 0) return true;

    const agentCapabilities = new Set(
      agent.capabilities.techStack.map(t => t.toLowerCase())
    );

    return required.every(req => 
      agentCapabilities.has(req.toLowerCase()) ||
      agent.capabilities.specializations?.some(s => 
        s.toLowerCase().includes(req.toLowerCase())
      )
    );
  }

  /**
   * Check if agent has sufficient capacity for task
   */
  private checkLoadCapacity(agent: AgentCapability, task: Task): boolean {
    // Convert task duration to load percentage (assuming 60 min = 100% load)
    const estimatedLoad = (task.estimatedDuration / 60) * 100;
    
    // Agent should not exceed 90% load
    return (agent.currentLoad + estimatedLoad) < 90;
  }

  /**
   * Calculate capability match score (0-100)
   */
  calculateCapabilityScore(agent: AgentCapability, task: Task): number {
    let score = 0;
    const reasons: string[] = [];

    // Task type match (40 points)
    if (agent.capabilities.taskTypes.includes(task.type)) {
      score += 40;
      reasons.push(`Task type '${task.type}' matches agent capabilities`);
    } else {
      reasons.push(`Task type '${task.type}' not in agent capabilities`);
    }

    // Required capabilities match (40 points)
    if (task.requiredCapabilities.length > 0) {
      const matchedCount = task.requiredCapabilities.filter(req => 
        this.hasRequiredCapabilities(agent, [req])
      ).length;
      
      const capabilityScore = (matchedCount / task.requiredCapabilities.length) * 40;
      score += capabilityScore;
      reasons.push(`Matched ${matchedCount}/${task.requiredCapabilities.length} required capabilities`);
    } else {
      score += 40; // Full points if no specific requirements
      reasons.push('No specific capability requirements');
    }

    // Specialization bonus (20 points)
    const hasSpecialization = task.requiredCapabilities.some(req =>
      agent.capabilities.specializations?.some(spec =>
        spec.toLowerCase().includes(req.toLowerCase())
      )
    );
    
    if (hasSpecialization) {
      score += 20;
      reasons.push('Agent has relevant specialization');
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate load score (0-100)
   * Higher score means agent has more available capacity
   */
  calculateLoadScore(agent: AgentCapability, task: Task): number {
    const availableCapacity = 100 - agent.currentLoad;
    const taskLoad = (task.estimatedDuration / 60) * 100;
    const remainingAfterTask = availableCapacity - taskLoad;

    // Normalize to 0-100 scale
    // Agents with more capacity get higher scores
    return Math.max(0, Math.min(100, remainingAfterTask));
  }

  /**
   * Calculate performance score (0-100)
   * Based on success rate and metrics
   */
  calculatePerformanceScore(agent: AgentCapability): number {
    let score = 0;

    // Success rate (60 points)
    score += agent.capabilities.successRate * 60;

    // Metrics bonus (40 points)
    if (agent.metrics) {
      const totalTasks = agent.metrics.totalTasksCompleted;
      
      if (totalTasks > 100) {
        score += 40; // Experienced agent
      } else if (totalTasks > 50) {
        score += 30; // Moderate experience
      } else if (totalTasks > 20) {
        score += 20; // Some experience
      } else {
        score += 10; // New agent
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate response time score (0-100)
   * Lower response time = higher score
   */
  calculateResponseScore(agent: AgentCapability): number {
    // Normalize: 10 seconds = 0 points, 2 seconds = 100 points
    const normalized = Math.max(0, 10 - agent.capabilities.avgResponseTime);
    return (normalized / 8) * 100;
  }

  /**
   * Calculate overall match score with details
   */
  calculateMatchScore(
    agent: AgentCapability, 
    task: Task,
    weights?: {
      capability?: number;
      load?: number;
      performance?: number;
      response?: number;
    }
  ): {
    total: number;
    capability: number;
    load: number;
    performance: number;
    response: number;
  } {
    const defaultWeights = {
      capability: 0.4,
      load: 0.3,
      performance: 0.2,
      response: 0.1
    };

    const finalWeights = { ...defaultWeights, ...weights };

    const capability = this.calculateCapabilityScore(agent, task);
    const load = this.calculateLoadScore(agent, task);
    const performance = this.calculatePerformanceScore(agent);
    const response = this.calculateResponseScore(agent);

    const total = 
      capability * finalWeights.capability +
      load * finalWeights.load +
      performance * finalWeights.performance +
      response * finalWeights.response;

    return {
      total: Math.min(total, 100),
      capability,
      load,
      performance,
      response
    };
  }

  /**
   * Rank candidates by suitability
   */
  rankCandidates(
    task: Task,
    candidates: AgentCapability[],
    weights?: {
      capability?: number;
      load?: number;
      performance?: number;
      response?: number;
    }
  ): MatchResult[] {
    const results: MatchResult[] = candidates.map(agent => {
      const scores = this.calculateMatchScore(agent, task, weights);
      const reasons = this.generateReasoning(agent, task, scores);
      
      return {
        agentId: agent.agentId,
        agentName: agent.name,
        confidence: scores.total / 100, // Convert to 0-1 range
        reasons
      };
    });

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * Generate reasoning for match result
   */
  private generateReasoning(
    agent: AgentCapability,
    task: Task,
    scores: {
      total: number;
      capability: number;
      load: number;
      performance: number;
      response: number;
    }
  ): string[] {
    const reasons: string[] = [];

    // Capability reasons
    if (scores.capability >= 80) {
      reasons.push('Excellent capability match');
    } else if (scores.capability >= 60) {
      reasons.push('Good capability match');
    } else {
      reasons.push('Adequate capability match');
    }

    // Load reasons
    if (scores.load >= 70) {
      reasons.push('Good availability');
    } else if (scores.load >= 40) {
      reasons.push('Moderate availability');
    } else {
      reasons.push('Limited availability');
    }

    // Performance reasons
    if (scores.performance >= 80) {
      reasons.push('Highly reliable');
    } else if (scores.performance >= 60) {
      reasons.push('Reliable performance');
    }

    // Response time reasons
    if (scores.response >= 70) {
      reasons.push('Fast response time');
    } else if (scores.response >= 50) {
      reasons.push('Moderate response time');
    }

    return reasons;
  }

  /**
   * Get top N candidates
   */
  getTopCandidates(candidates: MatchResult[], count: number): MatchResult[] {
    return candidates.slice(0, count);
  }

  /**
   * Get alternative candidates (excluding top choice)
   */
  getAlternativeCandidates(candidates: MatchResult[], count: number = 3): string[] {
    return candidates
      .slice(1, count + 1)
      .map(c => c.agentId);
  }

  /**
   * Find best candidate for a task
   */
  findBestCandidate(
    task: Task,
    agents: Map<string, AgentCapability>,
    weights?: {
      capability?: number;
      load?: number;
      performance?: number;
      response?: number;
    }
  ): MatchResult | null {
    const candidates = this.findCandidates(task, agents);
    if (candidates.length === 0) {
      return null;
    }

    const ranked = this.rankCandidates(task, candidates, weights);
    return ranked[0];
  }

  /**
   * Check if no agents are available for task
   */
  isNoAgentAvailable(task: Task, agents: Map<string, AgentCapability>): boolean {
    return this.findCandidates(task, agents).length === 0;
  }
}
