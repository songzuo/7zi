/**
 * Project Management Types
 * Enhanced project types with task integration and team management
 */

import { Task } from '@/lib/types/task-types';

// ============================================================================
// Project Status Types
// ============================================================================

export type ProjectStatus = 'active' | 'completed' | 'paused' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { color: string; label: string }> = {
  active: {
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    label: '🟢 进行中',
  },
  completed: {
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    label: '🔵 已完成',
  },
  paused: {
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    label: '🟡 已暂停',
  },
  archived: {
    color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400',
    label: '⚫ 已归档',
  },
};

// ============================================================================
// Team Member Types
// ============================================================================

export interface ProjectTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedTasks: string[]; // Array of task IDs
  joinDate: string;
  isActive: boolean;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  color?: string; // Project color for UI identification
  status: ProjectStatus;
  priority: ProjectPriority;
  category: string; // Keeping this for backward compatibility
  thumbnail: string;
  images: string[];
  techStack: string[];
  client?: string;
  duration: string;
  highlights: string[];
  testimonial?: {
    author: string;
    content: string;
    avatar?: string;
  };
  links: {
    live?: string;
    github?: string;
  };
  // New fields for enhanced project management
  startDate?: string;
  endDate?: string;
  budget?: number;
  teamMembers: ProjectTeamMember[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Project Input Types (for validation)
// ============================================================================

export interface CreateProjectInput {
  title: string;
  description: string;
  color?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  category: string;
  thumbnail?: string;
  images?: string[];
  techStack?: string[];
  client?: string;
  duration?: string;
  highlights?: string[];
  testimonial?: {
    author: string;
    content: string;
    avatar?: string;
  };
  links?: {
    live?: string;
    github?: string;
  };
  startDate?: string;
  endDate?: string;
  budget?: number;
  teamMembers?: ProjectTeamMember[];
}

export interface UpdateProjectInput {
  id: string;
  title?: string;
  description?: string;
  color?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  category?: string;
  thumbnail?: string;
  images?: string[];
  techStack?: string[];
  client?: string;
  duration?: string;
  highlights?: string[];
  testimonial?: {
    author: string;
    content: string;
    avatar?: string;
  };
  links?: {
    live?: string;
    github?: string;
  };
  startDate?: string;
  endDate?: string;
  budget?: number;
  teamMembers?: ProjectTeamMember[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ProjectResponse {
  success: boolean;
  data?: Project;
  error?: string;
  message?: string;
  code?: string;
}

export interface ProjectsResponse {
  success: boolean;
  data: Project[];
  error?: string;
  message?: string;
  code?: string;
}

export interface ProjectTasksResponse {
  success: boolean;
  projectId: string;
  tasks: Task[];
  error?: string;
  message?: string;
  code?: string;
}