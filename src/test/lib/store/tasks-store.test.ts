import { describe, it, expect, beforeEach } from 'vitest';
import { useTasksStore } from '@/lib/store/tasks-store';
import { act } from '@testing-library/react';

describe('tasks-store', () => {
  beforeEach(() => {
    // Reset store before each test
    useTasksStore.setState({ tasks: [] });
  });

  describe('addTask', () => {
    it('should add a new task with generated id', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Test Task',
          description: 'Test Description',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const tasks = useTasksStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Test Task');
      expect(tasks[0].id).toMatch(/^task_/);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Test Task',
          description: 'Test Description',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const task = useTasksStore.getState().tasks[0];
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should initialize with empty comments array', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Test Task',
          description: 'Test Description',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const task = useTasksStore.getState().tasks[0];
      expect(task.comments).toEqual([]);
    });

    it('should create initial history entry', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Test Task',
          description: 'Test Description',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const task = useTasksStore.getState().tasks[0];
      expect(task.history).toHaveLength(1);
      expect(task.history[0].status).toBe('pending');
    });
  });

  describe('updateTask', () => {
    it('should update existing task', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Original Title',
          description: 'Test Description',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const taskId = useTasksStore.getState().tasks[0].id;

      act(() => {
        useTasksStore.getState().updateTask(taskId, {
          title: 'Updated Title'
        });
      });

      const task = useTasksStore.getState().tasks[0];
      expect(task.title).toBe('Updated Title');
    });

    it('should not affect other tasks', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Task 1',
          description: 'Description 1',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
        useTasksStore.getState().addTask({
          title: 'Task 2',
          description: 'Description 2',
          type: 'design',
          priority: 'low',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const task1Id = useTasksStore.getState().tasks[0].id;

      act(() => {
        useTasksStore.getState().updateTask(task1Id, {
          title: 'Updated Task 1'
        });
      });

      const tasks = useTasksStore.getState().tasks;
      expect(tasks[0].title).toBe('Updated Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });
  });

  describe('deleteTask', () => {
    it('should remove task from store', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Task to Delete',
          description: 'Description',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const taskId = useTasksStore.getState().tasks[0].id;

      act(() => {
        useTasksStore.getState().deleteTask(taskId);
      });

      expect(useTasksStore.getState().tasks).toHaveLength(0);
    });

    it('should not affect other tasks when deleting', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Task 1',
          description: 'Description 1',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
        useTasksStore.getState().addTask({
          title: 'Task 2',
          description: 'Description 2',
          type: 'design',
          priority: 'low',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const task1Id = useTasksStore.getState().tasks[0].id;

      act(() => {
        useTasksStore.getState().deleteTask(task1Id);
      });

      const tasks = useTasksStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 2');
    });
  });

  describe('addComment', () => {
    it('should add comment to task', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Test Task',
          description: 'Description',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const taskId = useTasksStore.getState().tasks[0].id;

      act(() => {
        useTasksStore.getState().addComment(taskId, {
          author: 'Test User',
          content: 'Test Comment'
        });
      });

      const task = useTasksStore.getState().tasks[0];
      expect(task.comments).toHaveLength(1);
      expect(task.comments[0].content).toBe('Test Comment');
      expect(task.comments[0].author).toBe('Test User');
    });
  });

  describe('completeTask', () => {
    it('should update task status to completed', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Test Task',
          description: 'Description',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const taskId = useTasksStore.getState().tasks[0].id;

      act(() => {
        useTasksStore.getState().completeTask(taskId);
      });

      const task = useTasksStore.getState().tasks[0];
      expect(task.status).toBe('completed');
    });

    it('should add history entry for completion', () => {
      act(() => {
        useTasksStore.getState().addTask({
          title: 'Test Task',
          description: 'Description',
          type: 'development',
          priority: 'high',
          status: 'pending',
          createdBy: 'user'
        });
      });

      const taskId = useTasksStore.getState().tasks[0].id;

      act(() => {
        useTasksStore.getState().completeTask(taskId);
      });

      const task = useTasksStore.getState().tasks[0];
      const lastHistory = task.history[task.history.length - 1];
      expect(lastHistory.status).toBe('completed');
    });
  });
});
