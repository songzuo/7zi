/**
 * @fileoverview Core type definitions for the task management system.
 * @module lib/types/task-types
 * 
 * @description
 * This module defines all TypeScript types and interfaces related to
 * tasks, AI team members, and task assignment. These types are used
 * throughout the application for type-safe task operations.
 * 
 * @example
 * ```typescript
 * import type { Task, TaskStatus, TaskPriority } from '@/lib/types/task-types';
 * 
 * const task: Task = {
 *   id: 'task-1',
 *   title: 'Implement feature',
 *   description: 'Description here',
 *   type: 'development',
 *   priority: 'high',
 *   status: 'pending',
 *   createdBy: 'user',
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString(),
 *   comments: [],
 *   history: []
 * };
 * ```
 */

/**
 * Represents a comment on a task.
 * 
 * @description
 * Comments allow users and AI members to communicate about tasks.
 * Each comment is timestamped and attributed to an author.
 */
export interface TaskComment {
  /** Unique identifier for the comment */
  id: string;
  /** Identifier of the comment author (user ID or AI member ID) */
  author: string;
  /** The comment content in plain text */
  content: string;
  /** ISO 8601 timestamp of when the comment was created */
  timestamp: string;
}

/**
 * Represents a status change in a task's history.
 * 
 * @description
 * Tracks the lifecycle of a task through its various statuses.
 * Each entry records when the status changed, what it changed to,
 * and who initiated the change.
 */
export interface StatusChange {
  /** ISO 8601 timestamp of the status change */
  timestamp: string;
  /** The new status value */
  status: TaskStatus;
  /** Identifier of who initiated the status change */
  changedBy: string;
  /** Optional assignee ID if the change involved assignment */
  assignee?: string;
}

/**
 * Task type classification.
 * 
 * @description
 * Categorizes tasks by their primary domain or activity type.
 * Used for filtering, analytics, and AI member assignment matching.
 */
export type TaskType = 'development' | 'design' | 'research' | 'marketing' | 'other';

/**
 * Task priority levels.
 * 
 * @description
 * Defines the urgency of a task. Higher priority tasks are
 * typically processed and displayed first.
 * 
 * Priority order (highest to lowest):
 * 1. urgent - Critical tasks requiring immediate attention
 * 2. high - Important tasks that should be done soon
 * 3. medium - Standard priority (default)
 * 4. low - Tasks that can wait or have flexible deadlines
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Task status values.
 * 
 * @description
 * Represents the lifecycle state of a task.
 * 
 * Status flow:
 * - pending → Initial state when task is created
 * - assigned → Task has been assigned to an AI member
 * - in_progress → Work has started (currently unused, reserved for future)
 * - completed → Task has been finished
 */
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

/**
 * AI Member Role enumeration for task assignment.
 * 
 * @description
 * Defines the available AI member roles that can be assigned to tasks.
 * Each role has different capabilities and expertise areas.
 * 
 * Role descriptions:
 * - EXECUTOR: Handles code implementation and execution tasks
 * - DESIGNER: Specializes in UI/UX and visual design
 * - CONSULTANT: Provides research and advisory support
 * - PROMOTER: Handles marketing and promotional activities
 * - GENERAL: Flexible role for general-purpose tasks
 */
export enum AI_MEMBER_ROLES {
  /** Code implementation and execution specialist */
  EXECUTOR = 'executor',
  /** UI/UX and visual design specialist */
  DESIGNER = 'designer',
  /** Research and advisory specialist */
  CONSULTANT = 'consultant',
  /** Marketing and promotion specialist */
  PROMOTER = 'promoter',
  /** General-purpose task handler */
  GENERAL = 'general'
}

/**
 * Represents a task in the system.
 * 
 * @description
 * The core task entity containing all task information including
 * metadata, status history, and comments.
 * 
 * @example
 * ```typescript
 * const task: Task = {
 *   id: 'task_1234567890_abc123',
 *   title: 'Implement user authentication',
 *   description: 'Add OAuth2 support with Google and GitHub providers',
 *   type: 'development',
 *   priority: 'high',
 *   status: 'pending',
 *   projectId: 'project-1',
 *   createdBy: 'user',
 *   createdAt: '2024-01-15T10:30:00.000Z',
 *   updatedAt: '2024-01-15T10:30:00.000Z',
 *   comments: [],
 *   history: [{
 *     status: 'pending',
 *     timestamp: '2024-01-15T10:30:00.000Z',
 *     changedBy: 'user'
 *   }]
 * };
 * ```
 */
export interface Task {
  /** Unique identifier (format: task_{timestamp}_{random}) */
  id: string;
  /** Short title describing the task */
  title: string;
  /** Detailed description of the task requirements */
  description: string;
  /** Category of work the task involves */
  type: TaskType;
  /** Urgency level of the task */
  priority: TaskPriority;
  /** Current lifecycle state of the task */
  status: TaskStatus;
  /** ID of the assigned AI member (undefined if unassigned) */
  assignee?: string;
  /** Optional project association for grouping related tasks */
  projectId?: string;
  /** Who created this task (user or ai) */
  createdBy: 'user' | 'ai';
  /** ISO 8601 timestamp of task creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
  /** Array of comments on the task */
  comments: TaskComment[];
  /** Array of status change records */
  history: StatusChange[];
}

/**
 * Represents an AI team member.
 * 
 * @description
 * Defines an AI agent that can be assigned to tasks. Each member
 * has specific expertise areas and a current availability status.
 * 
 * @example
 * ```typescript
 * const member: AITeamMember = {
 *   id: 'ai-executor-1',
 *   name: 'Executor Alpha',
 *   role: 'executor',
 *   expertise: ['development', 'other'],
 *   status: 'available',
 *   completedTasks: 42,
 *   avatar: '/avatars/executor.png'
 * };
 * ```
 */
export interface AITeamMember {
  /** Unique identifier for the AI member */
  id: string;
  /** Display name of the AI member */
  name: string;
  /** Role identifier (corresponds to AI_MEMBER_ROLES) */
  role: string;
  /** Task types this member can handle */
  expertise: TaskType[];
  /** Current availability status */
  status: 'available' | 'busy' | 'offline';
  /** Number of tasks completed by this member */
  completedTasks: number;
  /** Optional avatar image URL */
  avatar?: string;
}

/**
 * Result of an AI task assignment suggestion.
 * 
 * @description
 * Returned by the AI assignment system when suggesting the best
 * member for a task. Includes confidence score and reasoning.
 * 
 * @example
 * ```typescript
 * const suggestion: AssignmentSuggestion = {
 *   memberId: 'ai-executor-1',
 *   memberName: 'Executor Alpha',
 *   confidence: 92,
 *   reason: 'Member has expertise in development tasks and is currently available'
 * };
 * ```
 */
export interface AssignmentSuggestion {
  /** ID of the suggested AI member */
  memberId: string;
  /** Display name of the suggested member */
  memberName: string;
  /** Confidence score (0-100, higher is better) */
  confidence: number;
  /** Human-readable explanation of why this member was suggested */
  reason: string;
}