/**
 * AI Task Assignment Service
 * 
 * This service provides intelligent task assignment based on:
 * - Task type and requirements
 * - AI team member expertise and availability
 * - Historical performance data
 * - Current workload balancing
 */

import { Task, TaskType, AITeamMember, AssignmentSuggestion } from '@/lib/types/task-types';
import { getAITeamForTaskAssignment } from '@/lib/services/task-dashboard-integration';

// Export internal functions for testing
export const calculateAssignmentScore = calculateAssignmentScore_;
export const calculateExpertiseMatch = calculateExpertiseMatch_;
export const generateAssignmentReason = generateAssignmentReason_;
export const getRelatedExpertiseMatches = getRelatedExpertiseMatches_;
export { WEIGHTS };
const WEIGHTS = {
  expertise: 0.4,      // How well the member's expertise matches the task
  availability: 0.3,   // Member's current availability status
  performance: 0.2,    // Historical performance (completed tasks)
  workload: 0.1        // Current workload balance
};

/**
 * Get AI assignment suggestions for a task
 */
export const getAIAssignmentSuggestions = (task: Task): AssignmentSuggestion[] => {
  const teamMembers = getAITeamForTaskAssignment();
  
  // Filter out offline members and ensure type safety
  const availableMembers: AITeamMember[] = teamMembers.filter(
    (member): member is AITeamMember => member.status !== 'offline'
  );
  
  if (availableMembers.length === 0) {
    return [];
  }
  
  // Calculate assignment scores for each member
  const suggestions = availableMembers.map(member => {
    const score = calculateAssignmentScore(task, member);
    const reason = generateAssignmentReason(task, member, score);
    
    return {
      memberId: member.id,
      memberName: member.name,
      confidence: Math.round(score * 100),
      reason
    };
  });
  
  // Sort by confidence (highest first)
  return suggestions.sort((a, b) => b.confidence - a.confidence);
};

/**
 * Get the best AI assignment for a task
 */
export const getBestAIAssignment = (task: Task): AssignmentSuggestion | null => {
  const suggestions = getAIAssignmentSuggestions(task);
  return suggestions.length > 0 ? suggestions[0] : null;
};

/**
 * Calculate assignment score for a member based on multiple factors
 */
const calculateAssignmentScore = (task: Task, member: AITeamMember): number => {
  // Expertise match score (0-1)
  const expertiseScore = calculateExpertiseMatch(task.type, member.expertise);
  
  // Availability score (0-1)
  const availabilityScore = member.status === 'available' ? 1 : 0.5;
  
  // Performance score based on completed tasks (normalized to 0-1)
  const maxCompletedTasks = Math.max(member.completedTasks, 10); // Use 10 as baseline
  const performanceScore = Math.min(member.completedTasks / maxCompletedTasks, 1);
  
  // Workload score - currently simplified (in real system would check current assignments)
  const workloadScore = member.status === 'available' ? 1 : 0.7;
  
  // Weighted average
  return (
    expertiseScore * WEIGHTS.expertise +
    availabilityScore * WEIGHTS.availability +
    performanceScore * WEIGHTS.performance +
    workloadScore * WEIGHTS.workload
  );
};

/**
 * Calculate how well a member's expertise matches the task type
 */
const calculateExpertiseMatch = (taskType: TaskType, memberExpertise: TaskType[]): number => {
  if (memberExpertise.includes(taskType)) {
    return 1; // Perfect match
  }
  
  // Check for partial matches or general expertise
  if (memberExpertise.includes('other')) {
    return 0.6; // General capability
  }
  
  // No direct match, but check if member has related expertise
  const relatedMatches = getRelatedExpertiseMatches(taskType, memberExpertise);
  return relatedMatches > 0 ? 0.4 : 0.2;
};

/**
 * Get related expertise matches for task types
 */
const getRelatedExpertiseMatches = (taskType: TaskType, memberExpertise: TaskType[]): number => {
  const relationships: Record<TaskType, TaskType[]> = {
    development: ['research', 'design'],
    design: ['development', 'marketing'],
    research: ['development', 'marketing'],
    marketing: ['design', 'research'],
    other: []
  };
  
  const relatedTypes = relationships[taskType] || [];
  return memberExpertise.filter(expertise => relatedTypes.includes(expertise)).length;
};

/**
 * Generate human-readable reason for assignment suggestion
 */
const generateAssignmentReason = (task: Task, member: AITeamMember, score: number): string => {
  const expertiseMatch = member.expertise.includes(task.type);
  
  if (score >= 0.8) {
    if (expertiseMatch) {
      return `${member.name} 是 ${getTaskTypeName(task.type)} 任务的专家，且当前可用`;
    }
    return `${member.name} 有丰富的相关经验，且当前工作负载较轻`;
  }
  
  if (score >= 0.6) {
    if (expertiseMatch) {
      return `${member.name} 擅长 ${getTaskTypeName(task.type)} 任务`;
    }
    return `${member.name} 有处理类似任务的经验`;
  }
  
  if (score >= 0.4) {
    return `${member.name} 可以处理此任务，但可能不是最佳选择`;
  }
  
  return `${member.name} 可以作为备选，但建议考虑其他成员`;
};

/**
 * Get human-readable task type name
 */
const getTaskTypeName = (taskType: TaskType): string => {
  const typeNames: Record<TaskType, string> = {
    development: '开发',
    design: '设计',
    research: '研究',
    marketing: '营销',
    other: '其他'
  };
  
  return typeNames[taskType] || taskType;
};

/**
 * Auto-assign a task to the best available AI member
 */
export const autoAssignTaskToAI = (task: Task): { task: Task; suggestion: AssignmentSuggestion } | null => {
  const bestSuggestion = getBestAIAssignment(task);
  
  if (!bestSuggestion) {
    return null;
  }
  
  // Update task with assignment
  const updatedTask: Task = {
    ...task,
    assignee: bestSuggestion.memberId,
    status: 'assigned',
    updatedAt: new Date().toISOString(),
    history: [
      ...task.history,
      {
        timestamp: new Date().toISOString(),
        status: 'assigned',
        changedBy: 'system',
        assignee: bestSuggestion.memberId
      }
    ]
  };
  
  return { task: updatedTask, suggestion: bestSuggestion };
};