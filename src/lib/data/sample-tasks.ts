/**
 * @fileoverview Sample tasks data for development and testing
 * @description Initial task data that matches the AI team members
 */

import { Task, TaskPriority, TaskStatus, TaskType } from '@/lib/types/task-types';

export const SAMPLE_TASKS: Task[] = [
  {
    id: 'task-001',
    title: '分析市场趋势',
    description: '深入分析当前AI市场趋势，识别机会和威胁，为团队提供战略建议。',
    type: 'research',
    priority: 'high',
    status: 'completed',
    assignee: 'agent-world-expert',
    createdBy: 'ai',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-05T14:30:00Z',
    comments: [
      {
        id: 'comment-001',
        content: '已完成初步市场调研，发现三个主要趋势...',
        author: 'agent-world-expert',
        timestamp: '2026-03-03T16:45:00Z'
      },
      {
        id: 'comment-002',
        content: '报告已提交，包含详细的数据分析和建议。',
        author: 'agent-world-expert',
        timestamp: '2026-03-05T14:30:00Z'
      }
    ],
    history: [
      {
        status: 'pending',
        timestamp: '2026-03-01T10:00:00Z',
        changedBy: 'system'
      },
      {
        status: 'assigned',
        timestamp: '2026-03-01T10:05:00Z',
        changedBy: 'agent-world-expert'
      },
      {
        status: 'in_progress',
        timestamp: '2026-03-02T09:00:00Z',
        changedBy: 'agent-world-expert'
      },
      {
        status: 'completed',
        timestamp: '2026-03-05T14:30:00Z',
        changedBy: 'agent-world-expert'
      }
    ]
  },
  {
    id: 'task-002',
    title: '竞品调研报告',
    description: '对主要竞争对手的产品功能、定价策略和用户体验进行全面调研。',
    type: 'research',
    priority: 'medium',
    status: 'in_progress',
    assignee: 'consultant',
    createdBy: 'user',
    createdAt: '2026-03-04T11:20:00Z',
    updatedAt: '2026-03-06T13:15:00Z',
    comments: [
      {
        id: 'comment-003',
        content: '已确定调研范围，包括5个主要竞品。',
        author: 'consultant',
        timestamp: '2026-03-04T15:30:00Z'
      },
      {
        id: 'comment-004',
        content: '完成3个竞品的初步分析，剩余2个预计明天完成。',
        author: 'consultant',
        timestamp: '2026-03-06T13:15:00Z'
      }
    ],
    history: [
      {
        status: 'pending',
        timestamp: '2026-03-04T11:20:00Z',
        changedBy: 'user'
      },
      {
        status: 'assigned',
        timestamp: '2026-03-04T11:25:00Z',
        changedBy: 'consultant'
      },
      {
        status: 'in_progress',
        timestamp: '2026-03-04T14:00:00Z',
        changedBy: 'consultant'
      }
    ]
  },
  {
    id: 'task-003',
    title: '系统架构评审',
    description: '对当前系统架构进行全面评审，识别潜在的性能瓶颈和扩展性问题。',
    type: 'development',
    priority: 'urgent',
    status: 'in_progress',
    assignee: 'architect',
    createdBy: 'ai',
    createdAt: '2026-03-05T09:15:00Z',
    updatedAt: '2026-03-07T10:45:00Z',
    comments: [
      {
        id: 'comment-005',
        content: '开始架构评审，重点关注数据库设计和API层。',
        author: 'architect',
        timestamp: '2026-03-05T14:20:00Z'
      },
      {
        id: 'comment-006',
        content: '发现两个潜在的性能问题，正在制定优化方案。',
        author: 'architect',
        timestamp: '2026-03-07T10:45:00Z'
      }
    ],
    history: [
      {
        status: 'pending',
        timestamp: '2026-03-05T09:15:00Z',
        changedBy: 'system'
      },
      {
        status: 'assigned',
        timestamp: '2026-03-05T09:20:00Z',
        changedBy: 'architect'
      },
      {
        status: 'in_progress',
        timestamp: '2026-03-05T13:00:00Z',
        changedBy: 'architect'
      }
    ]
  },
  {
    id: 'task-004',
    title: '实现看板功能',
    description: '开发和实现AI团队实时看板功能，展示成员状态和任务进度。',
    type: 'development',
    priority: 'high',
    status: 'in_progress',
    assignee: 'executor',
    createdBy: 'user',
    createdAt: '2026-03-06T08:30:00Z',
    updatedAt: '2026-03-07T16:20:00Z',
    comments: [
      {
        id: 'comment-007',
        content: '已完成UI组件开发，开始集成状态管理。',
        author: 'executor',
        timestamp: '2026-03-06T17:45:00Z'
      },
      {
        id: 'comment-008',
        content: '看板功能基本完成，正在进行测试和优化。',
        author: 'executor',
        timestamp: '2026-03-07T16:20:00Z'
      }
    ],
    history: [
      {
        status: 'pending',
        timestamp: '2026-03-06T08:30:00Z',
        changedBy: 'user'
      },
      {
        status: 'assigned',
        timestamp: '2026-03-06T08:35:00Z',
        changedBy: 'executor'
      },
      {
        status: 'in_progress',
        timestamp: '2026-03-06T10:00:00Z',
        changedBy: 'executor'
      }
    ]
  },
  {
    id: 'task-005',
    title: '界面优化',
    description: '对现有界面进行用户体验优化，提升交互流畅度和视觉一致性。',
    type: 'design',
    priority: 'medium',
    status: 'in_progress',
    assignee: 'designer',
    createdBy: 'ai',
    createdAt: '2026-03-06T14:00:00Z',
    updatedAt: '2026-03-07T11:30:00Z',
    comments: [
      {
        id: 'comment-009',
        content: '已完成用户流程分析，识别出3个主要优化点。',
        author: 'designer',
        timestamp: '2026-03-07T09:15:00Z'
      },
      {
        id: 'comment-010',
        content: '正在制作高保真原型，预计今天完成。',
        author: 'designer',
        timestamp: '2026-03-07T11:30:00Z'
      }
    ],
    history: [
      {
        status: 'pending',
        timestamp: '2026-03-06T14:00:00Z',
        changedBy: 'system'
      },
      {
        status: 'assigned',
        timestamp: '2026-03-06T14:05:00Z',
        changedBy: 'designer'
      },
      {
        status: 'in_progress',
        timestamp: '2026-03-07T08:00:00Z',
        changedBy: 'designer'
      }
    ]
  },
  {
    id: 'task-006',
    title: '宣传文案撰写',
    description: '为新产品功能撰写宣传文案，突出核心价值和差异化优势。',
    type: 'marketing',
    priority: 'low',
    status: 'pending',
    assignee: undefined,
    createdBy: 'user',
    createdAt: '2026-03-07T15:45:00Z',
    updatedAt: '2026-03-07T15:45:00Z',
    comments: [],
    history: [
      {
        status: 'pending',
        timestamp: '2026-03-07T15:45:00Z',
        changedBy: 'user'
      }
    ]
  }
];

// Helper function to get tasks by status
export const getTasksByStatus = (tasks: Task[], status: TaskStatus): Task[] => {
  return tasks.filter(task => task.status === status);
};

// Helper function to get tasks by assignee
export const getTasksByAssignee = (tasks: Task[], assigneeId: string): Task[] => {
  return tasks.filter(task => task.assignee === assigneeId);
};

// Helper function to get tasks by type
export const getTasksByType = (tasks: Task[], type: TaskType): Task[] => {
  return tasks.filter(task => task.type === type);
};

// Helper function to get tasks by priority
export const getTasksByPriority = (tasks: Task[], priority: TaskPriority): Task[] => {
  return tasks.filter(task => task.priority === priority);
};