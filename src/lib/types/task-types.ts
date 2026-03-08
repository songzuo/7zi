export interface TaskComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface StatusChange {
  timestamp: string;
  status: TaskStatus;
  changedBy: string;
  assignee?: string;
}

export type TaskType = 'development' | 'design' | 'research' | 'marketing' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

// AI Member Role enum for task assignment
export enum AI_MEMBER_ROLES {
  EXECUTOR = 'executor',
  DESIGNER = 'designer',
  CONSULTANT = 'consultant',
  PROMOTER = 'promoter',
  GENERAL = 'general'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignee?: string; // AI member id
  createdBy: 'user' | 'ai';
  createdAt: string;
  updatedAt: string;
  comments: TaskComment[];
  history: StatusChange[];
}

// AI Team Member interface
export interface AITeamMember {
  id: string;
  name: string;
  role: string;
  expertise: TaskType[];
  status: 'available' | 'busy' | 'offline';
  completedTasks: number;
  avatar?: string;
}

// Assignment suggestion result
export interface AssignmentSuggestion {
  memberId: string;
  memberName: string;
  confidence: number; // 0-100
  reason: string;
}