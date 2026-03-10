import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAIAssignmentSuggestions, getBestAIAssignment, autoAssignTaskToAI } from '@/lib/services/ai-task-assignment';
import { Task, TaskType } from '@/lib/types/task-types';
import { getAITeamForTaskAssignment } from '@/lib/services/task-dashboard-integration';

// Mock the dashboard integration service
vi.mock('@/lib/services/task-dashboard-integration', () => ({
  getAITeamForTaskAssignment: vi.fn()
}));

describe('AI Task Assignment Service', () => {
  const mockTeamMembers = [
    {
      id: 'executor-1',
      name: '执行者',
      role: 'executor',
      expertise: ['development'] as TaskType[],
      status: 'available' as const,
      completedTasks: 15,
      avatar: 'avatar1.png'
    },
    {
      id: 'designer-1',
      name: '设计师',
      role: 'designer',
      expertise: ['design'] as TaskType[],
      status: 'available' as const,
      completedTasks: 12,
      avatar: 'avatar2.png'
    },
    {
      id: 'consultant-1',
      name: '咨询师',
      role: 'consultant',
      expertise: ['research', 'marketing'] as TaskType[],
      status: 'busy' as const,
      completedTasks: 20,
      avatar: 'avatar3.png'
    },
    {
      id: 'architect-1',
      name: '架构师',
      role: 'architect',
      expertise: ['development', 'research'] as TaskType[],
      status: 'available' as const,
      completedTasks: 25,
      avatar: 'avatar4.png'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAITeamForTaskAssignment).mockReturnValue(mockTeamMembers);
  });

  describe('getAIAssignmentSuggestions', () => {
    it('should suggest best assignee for development task', () => {
      const task = {
        id: 'task-1',
        title: '开发新功能',
        description: '实现用户认证功能',
        type: 'development' as TaskType,
        priority: 'high',
        status: 'pending',
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };

      const suggestions = getAIAssignmentSuggestions(task);
      
      expect(suggestions).toHaveLength(4);
      // Architect should be first due to high completed tasks and expertise match
      expect(suggestions[0].memberId).toBe('architect-1');
      expect(suggestions[0].confidence).toBeGreaterThan(80);
    });

    it('should suggest best assignee for design task', () => {
      const task = {
        id: 'task-2',
        title: 'UI设计',
        description: '设计新的仪表板界面',
        type: 'design' as TaskType,
        priority: 'medium',
        status: 'pending',
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };

      const suggestions = getAIAssignmentSuggestions(task);
      
      expect(suggestions).toHaveLength(4);
      expect(suggestions[0].memberId).toBe('designer-1');
      expect(suggestions[0].confidence).toBeGreaterThan(80);
    });

    it('should suggest best assignee for research task', () => {
      const task = {
        id: 'task-3',
        title: '市场调研',
        description: '分析竞争对手的产品策略',
        type: 'research' as TaskType,
        priority: 'high',
        status: 'pending',
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };

      const suggestions = getAIAssignmentSuggestions(task);
      
      expect(suggestions).toHaveLength(4);
      // Architect has research expertise and is available, so should be preferred over busy consultant
      expect(suggestions[0].memberId).toBe('architect-1');
      expect(suggestions[0].confidence).toBeGreaterThan(60);
    });

    it('should handle unknown task types', () => {
      const task = {
        id: 'task-4',
        title: '未知任务',
        description: '处理未知类型的任务',
        type: 'other' as TaskType,
        priority: 'low',
        status: 'pending',
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };

      const suggestions = getAIAssignmentSuggestions(task);
      
      expect(suggestions).toHaveLength(4);
      // All members should have some confidence since 'other' is general
      expect(suggestions.every(s => s.confidence > 0)).toBe(true);
    });
  });

  describe('getBestAIAssignment', () => {
    it('should return the best assignment suggestion', () => {
      const task = {
        id: 'task-5',
        title: '开发API',
        description: '创建新的REST API端点',
        type: 'development' as TaskType,
        priority: 'high',
        status: 'pending',
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };

      const bestSuggestion = getBestAIAssignment(task);
      
      expect(bestSuggestion).not.toBeNull();
      expect(bestSuggestion?.memberId).toBe('architect-1');
      expect(bestSuggestion?.confidence).toBeGreaterThan(80);
    });

    it('should return null when no team members available', () => {
      vi.mocked(getAITeamForTaskAssignment).mockReturnValue([]);
      
      const task = {
        id: 'task-6',
        title: '测试任务',
        description: '测试空团队情况',
        type: 'development' as TaskType,
        priority: 'medium',
        status: 'pending',
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };

      const bestSuggestion = getBestAIAssignment(task);
      
      expect(bestSuggestion).toBeNull();
    });
  });

  describe('autoAssignTaskToAI', () => {
    it('should auto-assign task to best AI member', () => {
      const task = {
        id: 'task-7',
        title: '自动分配测试',
        description: '测试自动分配功能',
        type: 'development' as TaskType,
        priority: 'medium',
        status: 'pending',
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };

      const result = autoAssignTaskToAI(task);
      
      expect(result).not.toBeNull();
      expect(result?.task.assignee).toBe('architect-1');
      expect(result?.task.status).toBe('assigned');
      expect(result?.suggestion.memberId).toBe('architect-1');
    });

    it('should return null when no suitable assignee available', () => {
      vi.mocked(getAITeamForTaskAssignment).mockReturnValue([]);
      
      const task = {
        id: 'task-8',
        title: '无分配者测试',
        description: '测试无可用分配者的情况',
        type: 'development' as TaskType,
        priority: 'medium',
        status: 'pending',
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };

      const result = autoAssignTaskToAI(task);
      
      expect(result).toBeNull();
    });
  });
});