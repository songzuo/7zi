/**
 * AI Task Assignment Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getAIAssignmentSuggestions, 
  getBestAIAssignment,
  autoAssignTaskToAI 
} from './ai-task-assignment';

// Mock the task-dashboard-integration
vi.mock('@/lib/services/task-dashboard-integration', () => ({
  getAITeamForTaskAssignment: vi.fn()
}));

import { getAITeamForTaskAssignment } from '@/lib/services/task-dashboard-integration';
import type { Task, AITeamMember } from '@/lib/types/task-types';

const mockMembers: AITeamMember[] = [
  {
    id: 'architect',
    name: '架构师',
    role: 'architect',
    status: 'available',
    expertise: ['development', 'research'],
    completedTasks: 50,
    avatar: '/avatars/architect.png'
  },
  {
    id: 'designer',
    name: '设计师',
    role: 'designer',
    status: 'available',
    expertise: ['design', 'marketing'],
    completedTasks: 30,
    avatar: '/avatars/designer.png'
  },
  {
    id: 'researcher',
    name: '研究员',
    role: 'researcher',
    status: 'busy',
    expertise: ['research', 'development'],
    completedTasks: 45,
    avatar: '/avatars/researcher.png'
  }
];

const mockTask: Task = {
  id: 'task-001',
  title: '开发新功能',
  description: '实现用户认证模块',
  type: 'development',
  priority: 'high',
  status: 'pending',
  createdAt: '2026-03-15T00:00:00Z',
  updatedAt: '2026-03-15T00:00:00Z',
  history: []
};

describe('ai-task-assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAITeamForTaskAssignment).mockReturnValue(mockMembers);
  });

  describe('getAIAssignmentSuggestions', () => {
    it('should return suggestions for a valid task', () => {
      const suggestions = getAIAssignmentSuggestions(mockTask);
      
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('memberId');
      expect(suggestions[0]).toHaveProperty('confidence');
      expect(suggestions[0]).toHaveProperty('reason');
    });

    it('should exclude offline members from suggestions', () => {
      const membersWithOffline = [
        ...mockMembers,
        { 
          id: 'offline-agent', 
          name: '离线代理', 
          role: 'developer',
          status: 'offline',
          expertise: ['development'],
          completedTasks: 10,
          avatar: ''
        }
      ] as AITeamMember[];
      
      vi.mocked(getAITeamForTaskAssignment).mockReturnValue(membersWithOffline);
      
      const suggestions = getAIAssignmentSuggestions(mockTask);
      const offlineIds = suggestions.map(s => s.memberId);
      
      expect(offlineIds).not.toContain('offline-agent');
    });

    it('should return empty array when no members available', () => {
      vi.mocked(getAITeamForTaskAssignment).mockReturnValue([]);
      
      const suggestions = getAIAssignmentSuggestions(mockTask);
      
      expect(suggestions).toEqual([]);
    });

    it('should sort suggestions by confidence (highest first)', () => {
      const suggestions = getAIAssignmentSuggestions(mockTask);
      
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });
  });

  describe('getBestAIAssignment', () => {
    it('should return the best assignment suggestion', () => {
      const best = getBestAIAssignment(mockTask);
      
      expect(best).not.toBeNull();
      expect(best).toHaveProperty('memberId');
      expect(best).toHaveProperty('confidence');
    });

    it('should return null when no members available', () => {
      vi.mocked(getAITeamForTaskAssignment).mockReturnValue([]);
      
      const best = getBestAIAssignment(mockTask);
      
      expect(best).toBeNull();
    });
  });

  describe('autoAssignTaskToAI', () => {
    it('should assign task to best available member', () => {
      const result = autoAssignTaskToAI(mockTask);
      
      expect(result).not.toBeNull();
      expect(result!.task.assignee).toBeDefined();
      expect(result!.task.status).toBe('assigned');
    });

    it('should add assignment to task history', () => {
      const result = autoAssignTaskToAI(mockTask);
      
      expect(result!.task.history).toHaveLength(1);
      expect(result!.task.history[0].status).toBe('assigned');
      expect(result!.task.history[0].changedBy).toBe('system');
    });

    it('should return null when no assignment possible', () => {
      vi.mocked(getAITeamForTaskAssignment).mockReturnValue([]);
      
      const result = autoAssignTaskToAI(mockTask);
      
      expect(result).toBeNull();
    });
  });
});
