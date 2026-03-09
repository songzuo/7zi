import { describe, it, expect } from 'vitest';
import {
  taskToDashboardProject,
  taskToDashboardActivity,
  getDashboardProjectsFromTasks,
  getDashboardActivitiesFromTasks,
  calculateOverallProgress,
  type DashboardProject,
  type DashboardActivity,
} from './dashboard-task-adapter';
import type { Task } from '@/lib/types/task-types';
import type { AIMember } from '@/stores/dashboardStore';

// Mock task factory
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'Test description',
  type: 'development',
  priority: 'medium',
  status: 'pending',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

// Mock member factory
const createMockMember = (overrides: Partial<AIMember> = {}): AIMember => ({
  id: 'member-1',
  name: 'Test Member',
  role: 'Executor',
  status: 'active',
  avatar: '/avatar.png',
  ...overrides,
});

describe('dashboard-task-adapter', () => {
  const mockMembers: AIMember[] = [
    createMockMember({ id: 'member-1', name: 'Alice' }),
    createMockMember({ id: 'member-2', name: 'Bob' }),
  ];

  describe('taskToDashboardProject', () => {
    it('should convert task to dashboard project', () => {
      const task = createMockTask({
        id: 'task-1',
        title: 'My Project',
        status: 'in_progress',
        assignee: 'member-1',
      });

      const project = taskToDashboardProject(task, mockMembers);

      expect(project.id).toBe('task-1');
      expect(project.name).toBe('My Project');
      expect(project.status).toBe('active');
      expect(project.team).toContain('Alice');
    });

    it('should return completed status for completed task', () => {
      const task = createMockTask({ status: 'completed' });
      const project = taskToDashboardProject(task, mockMembers);

      expect(project.status).toBe('completed');
      expect(project.progress).toBe(100);
    });

    it('should return paused status for pending task', () => {
      const task = createMockTask({ status: 'pending' });
      const project = taskToDashboardProject(task, mockMembers);

      expect(project.status).toBe('paused');
      expect(project.progress).toBe(25);
    });

    it('should return active status for assigned task', () => {
      const task = createMockTask({ status: 'assigned' });
      const project = taskToDashboardProject(task, mockMembers);

      expect(project.status).toBe('active');
      expect(project.progress).toBe(50);
    });

    it('should return active status for in_progress task', () => {
      const task = createMockTask({ status: 'in_progress' });
      const project = taskToDashboardProject(task, mockMembers);

      expect(project.status).toBe('active');
      expect(project.progress).toBe(75);
    });

    it('should handle task without assignee', () => {
      const task = createMockTask({ assignee: undefined });
      const project = taskToDashboardProject(task, mockMembers);

      expect(project.team).toEqual(['未分配']);
    });

    it('should handle task with unknown assignee', () => {
      const task = createMockTask({ assignee: 'unknown-member' });
      const project = taskToDashboardProject(task, mockMembers);

      expect(project.team).toEqual(['未分配']);
    });

    it('should calculate task completion correctly', () => {
      const completedTask = createMockTask({ status: 'completed' });
      const pendingTask = createMockTask({ status: 'pending' });

      const completedProject = taskToDashboardProject(completedTask, mockMembers);
      const pendingProject = taskToDashboardProject(pendingTask, mockMembers);

      expect(completedProject.tasks.completed).toBe(1);
      expect(pendingProject.tasks.completed).toBe(0);
    });

    it('should have correct total tasks count', () => {
      const task = createMockTask();
      const project = taskToDashboardProject(task, mockMembers);

      expect(project.tasks.total).toBe(1);
    });
  });

  describe('taskToDashboardActivity', () => {
    it('should create created activity', () => {
      const task = createMockTask({ title: 'New Task' });
      const activity = taskToDashboardActivity(task, mockMembers, 'created');

      expect(activity.type).toBe('task_created');
      expect(activity.message).toContain('创建新任务');
      expect(activity.message).toContain('New Task');
      expect(activity.emoji).toBe('🆕');
    });

    it('should create assigned activity', () => {
      const task = createMockTask({
        title: 'Assigned Task',
        assignee: 'member-1',
      });
      const activity = taskToDashboardActivity(task, mockMembers, 'assigned');

      expect(activity.type).toBe('task_assigned');
      expect(activity.message).toContain('分配任务给 Alice');
      expect(activity.emoji).toBe('🔄');
    });

    it('should create completed activity', () => {
      const task = createMockTask({ title: 'Completed Task' });
      const activity = taskToDashboardActivity(task, mockMembers, 'completed');

      expect(activity.type).toBe('task_completed');
      expect(activity.message).toContain('完成任务');
      expect(activity.emoji).toBe('✅');
    });

    it('should handle task with unknown assignee in assigned activity', () => {
      const task = createMockTask({
        title: 'Task',
        assignee: 'unknown',
      });
      const activity = taskToDashboardActivity(task, mockMembers, 'assigned');

      expect(activity.message).toContain('未知成员');
    });

    it('should generate unique activity ID', () => {
      const task = createMockTask({ id: 'task-123' });
      const activity = taskToDashboardActivity(task, mockMembers, 'created');

      expect(activity.id).toBe('task-123-created');
    });

    it('should include time in activity', () => {
      const task = createMockTask({
        updatedAt: '2024-02-15T10:30:00.000Z',
      });
      const activity = taskToDashboardActivity(task, mockMembers, 'created');

      expect(activity.time).toBeDefined();
    });
  });

  describe('getDashboardProjectsFromTasks', () => {
    it('should convert multiple tasks to projects', () => {
      const tasks = [
        createMockTask({ id: '1', title: 'Task 1' }),
        createMockTask({ id: '2', title: 'Task 2' }),
        createMockTask({ id: '3', title: 'Task 3' }),
      ];

      const projects = getDashboardProjectsFromTasks(tasks, mockMembers);

      expect(projects).toHaveLength(3);
      expect(projects[0].name).toBe('Task 1');
      expect(projects[1].name).toBe('Task 2');
      expect(projects[2].name).toBe('Task 3');
    });

    it('should return empty array for empty tasks', () => {
      const projects = getDashboardProjectsFromTasks([], mockMembers);
      expect(projects).toHaveLength(0);
    });
  });

  describe('getDashboardActivitiesFromTasks', () => {
    it('should create activities for tasks', () => {
      const tasks = [
        createMockTask({
          id: '1',
          title: 'Task 1',
          status: 'pending',
          assignee: 'member-1',
        }),
      ];

      const activities = getDashboardActivitiesFromTasks(tasks, mockMembers);

      // Should have created and assigned activities
      expect(activities.length).toBeGreaterThanOrEqual(2);
      expect(activities.some((a) => a.type === 'task_created')).toBe(true);
      expect(activities.some((a) => a.type === 'task_assigned')).toBe(true);
    });

    it('should include completed activity for completed tasks', () => {
      const tasks = [
        createMockTask({
          id: '1',
          title: 'Completed Task',
          status: 'completed',
        }),
      ];

      const activities = getDashboardActivitiesFromTasks(tasks, mockMembers);

      expect(activities.some((a) => a.type === 'task_completed')).toBe(true);
    });

    it('should not include assigned activity for tasks without assignee', () => {
      const tasks = [
        createMockTask({
          id: '1',
          title: 'Unassigned Task',
          status: 'pending',
          assignee: undefined,
        }),
      ];

      const activities = getDashboardActivitiesFromTasks(tasks, mockMembers);

      expect(activities.some((a) => a.type === 'task_assigned')).toBe(false);
    });

    it('should limit activities to 20 most recent', () => {
      const tasks = Array.from({ length: 15 }, (_, i) =>
        createMockTask({
          id: `task-${i}`,
          title: `Task ${i}`,
          status: 'completed',
          assignee: 'member-1',
          updatedAt: new Date(Date.now() + i * 1000).toISOString(),
        })
      );

      const activities = getDashboardActivitiesFromTasks(tasks, mockMembers);

      expect(activities.length).toBeLessThanOrEqual(20);
    });

    it('should sort activities by time (newest first)', () => {
      const tasks = [
        createMockTask({
          id: '1',
          title: 'Old Task',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }),
        createMockTask({
          id: '2',
          title: 'New Task',
          updatedAt: '2024-12-01T00:00:00.000Z',
        }),
      ];

      const activities = getDashboardActivitiesFromTasks(tasks, mockMembers);

      // Newer task activity should come first
      const newTaskActivity = activities.findIndex((a) =>
        a.message.includes('New Task')
      );
      const oldTaskActivity = activities.findIndex((a) =>
        a.message.includes('Old Task')
      );

      expect(newTaskActivity).toBeLessThan(oldTaskActivity);
    });
  });

  describe('calculateOverallProgress', () => {
    it('should calculate overall progress correctly', () => {
      const tasks = [
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'in_progress' }),
      ];

      const progress = calculateOverallProgress(tasks);

      expect(progress).toBe(50); // 2/4 = 50%
    });

    it('should return 0 for empty tasks', () => {
      const progress = calculateOverallProgress([]);
      expect(progress).toBe(0);
    });

    it('should return 100 for all completed tasks', () => {
      const tasks = [
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'completed' }),
      ];

      const progress = calculateOverallProgress(tasks);
      expect(progress).toBe(100);
    });

    it('should return 0 for no completed tasks', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'in_progress' }),
      ];

      const progress = calculateOverallProgress(tasks);
      expect(progress).toBe(0);
    });

    it('should round progress to integer', () => {
      const tasks = [
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'pending' }),
      ];

      const progress = calculateOverallProgress(tasks);

      expect(progress).toBe(33); // 1/3 = ~33.33%
    });
  });
});