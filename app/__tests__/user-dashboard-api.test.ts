/**
 * 用户仪表板 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/users/[userId]/dashboard/route';

// Mock NextRequest
class MockNextRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}

describe('User Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return dashboard data for valid user', async () => {
    const request = new MockNextRequest('http://localhost/api/users/test-user/dashboard') as any;
    const params = Promise.resolve({ userId: 'test-user' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toBeDefined();
    expect(data.taskTrend).toBeDefined();
    expect(data.activities).toBeDefined();
    expect(data.achievements).toBeDefined();
    expect(data.recentTasks).toBeDefined();
    expect(data.lastUpdated).toBeDefined();
  });

  it('should return correct stats structure', async () => {
    const request = new MockNextRequest('http://localhost/api/users/test-user/dashboard') as any;
    const params = Promise.resolve({ userId: 'test-user' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(data.stats).toHaveProperty('totalTasks');
    expect(data.stats).toHaveProperty('completedTasks');
    expect(data.stats).toHaveProperty('inProgressTasks');
    expect(data.stats).toHaveProperty('overdueTasks');
    expect(data.stats).toHaveProperty('contributionScore');
    expect(data.stats).toHaveProperty('ranking');
    expect(data.stats).toHaveProperty('totalMembers');
    expect(data.stats).toHaveProperty('streak');
    expect(data.stats).toHaveProperty('achievements');
  });

  it('should return task trend data', async () => {
    const request = new MockNextRequest('http://localhost/api/users/test-user/dashboard') as any;
    const params = Promise.resolve({ userId: 'test-user' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(Array.isArray(data.taskTrend)).toBe(true);
    expect(data.taskTrend.length).toBeGreaterThan(0);
    
    const trendItem = data.taskTrend[0];
    expect(trendItem).toHaveProperty('date');
    expect(trendItem).toHaveProperty('completed');
    expect(trendItem).toHaveProperty('created');
  });

  it('should return activities with correct types', async () => {
    const request = new MockNextRequest('http://localhost/api/users/test-user/dashboard') as any;
    const params = Promise.resolve({ userId: 'test-user' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(Array.isArray(data.activities)).toBe(true);
    
    const validTypes = ['task_complete', 'task_create', 'comment', 'commit', 'review'];
    data.activities.forEach((activity: any) => {
      expect(validTypes).toContain(activity.type);
      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('title');
      expect(activity).toHaveProperty('timestamp');
    });
  });

  it('should return achievements with progress', async () => {
    const request = new MockNextRequest('http://localhost/api/users/test-user/dashboard') as any;
    const params = Promise.resolve({ userId: 'test-user' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(Array.isArray(data.achievements)).toBe(true);
    
    data.achievements.forEach((achievement: any) => {
      expect(achievement).toHaveProperty('id');
      expect(achievement).toHaveProperty('name');
      expect(achievement).toHaveProperty('description');
      expect(achievement).toHaveProperty('icon');
    });
  });

  it('should return recent tasks', async () => {
    const request = new MockNextRequest('http://localhost/api/users/test-user/dashboard') as any;
    const params = Promise.resolve({ userId: 'test-user' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(Array.isArray(data.recentTasks)).toBe(true);
    
    const validStatuses = ['todo', 'in_progress', 'completed', 'blocked'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    
    data.recentTasks.forEach((task: any) => {
      expect(validStatuses).toContain(task.status);
      expect(validPriorities).toContain(task.priority);
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('labels');
    });
  });
});