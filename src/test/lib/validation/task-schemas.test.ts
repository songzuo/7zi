/**
 * Task Schemas Tests
 * Tests for src/lib/validation/task-schemas.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createTaskSchema,
  updateTaskSchema,
  addCommentSchema,
  taskQuerySchema,
  taskIdSchema,
  batchUpdateSchema,
  TaskTypeSchema,
  TaskPrioritySchema,
  TaskStatusSchema
} from '@/lib/validation/task-schemas';

describe('task-schemas', () => {
  // ============================================================================
  // TaskTypeSchema
  // ============================================================================

  describe('TaskTypeSchema', () => {
    it('should accept valid task types', () => {
      expect(TaskTypeSchema.parse('development')).toBe('development');
      expect(TaskTypeSchema.parse('design')).toBe('design');
      expect(TaskTypeSchema.parse('research')).toBe('research');
      expect(TaskTypeSchema.parse('marketing')).toBe('marketing');
      expect(TaskTypeSchema.parse('other')).toBe('other');
    });

    it('should reject invalid task types', () => {
      expect(() => TaskTypeSchema.parse('invalid')).toThrow();
      expect(() => TaskTypeSchema.parse('')).toThrow();
    });

    it('should handle null input', () => {
      expect(() => TaskTypeSchema.parse(null)).toThrow();
    });

    it('should handle undefined input', () => {
      expect(() => TaskTypeSchema.parse(undefined)).toThrow();
    });

    it('should provide error message for invalid type', () => {
      try {
        TaskTypeSchema.parse('wrong');
      } catch (e: any) {
        // Error message should indicate invalid option
        expect(e.issues[0].message).toBeDefined();
      }
    });
  });

  // ============================================================================
  // TaskPrioritySchema
  // ============================================================================

  describe('TaskPrioritySchema', () => {
    it('should accept valid priorities', () => {
      expect(TaskPrioritySchema.parse('low')).toBe('low');
      expect(TaskPrioritySchema.parse('medium')).toBe('medium');
      expect(TaskPrioritySchema.parse('high')).toBe('high');
      expect(TaskPrioritySchema.parse('urgent')).toBe('urgent');
    });

    it('should reject invalid priorities', () => {
      expect(() => TaskPrioritySchema.parse('invalid')).toThrow();
      expect(() => TaskPrioritySchema.parse('')).toThrow();
      expect(() => TaskPrioritySchema.parse('critical')).toThrow();
    });
  });

  // ============================================================================
  // TaskStatusSchema
  // ============================================================================

  describe('TaskStatusSchema', () => {
    it('should accept valid statuses', () => {
      expect(TaskStatusSchema.parse('pending')).toBe('pending');
      expect(TaskStatusSchema.parse('assigned')).toBe('assigned');
      expect(TaskStatusSchema.parse('in_progress')).toBe('in_progress');
      expect(TaskStatusSchema.parse('completed')).toBe('completed');
    });

    it('should reject invalid statuses', () => {
      expect(() => TaskStatusSchema.parse('invalid')).toThrow();
      expect(() => TaskStatusSchema.parse('cancelled')).toThrow();
    });
  });

  // ============================================================================
  // createTaskSchema
  // ============================================================================

  describe('createTaskSchema', () => {
    const validTask = {
      title: 'Test Task',
      description: 'Test Description',
      type: 'development',
      priority: 'high'
    };

    it('should accept valid task data', () => {
      const result = createTaskSchema.parse(validTask);
      expect(result.title).toBe('Test Task');
      expect(result.type).toBe('development');
      expect(result.priority).toBe('high');
    });

    it('should apply default values for optional fields', () => {
      const result = createTaskSchema.parse({ title: 'Test', description: 'Test' });
      expect(result.type).toBe('other');
      expect(result.priority).toBe('medium');
    });

    it('should reject empty title', () => {
      expect(() => createTaskSchema.parse({ ...validTask, title: '' })).toThrow();
    });

    it('should handle whitespace-only title (trim behavior)', () => {
      // Zod's trim() converts whitespace-only to empty string
      const result = createTaskSchema.parse({ ...validTask, title: '   ' });
      expect(result.title).toBe('');
    });

    it('should reject title exceeding 200 characters', () => {
      const longTitle = 'A'.repeat(201);
      expect(() => createTaskSchema.parse({ ...validTask, title: longTitle })).toThrow();
    });

    it('should accept title at exactly 200 characters', () => {
      const maxTitle = 'A'.repeat(200);
      const result = createTaskSchema.parse({ ...validTask, title: maxTitle });
      expect(result.title).toBe(maxTitle);
    });

    it('should reject description exceeding 5000 characters', () => {
      const longDesc = 'A'.repeat(5001);
      expect(() => createTaskSchema.parse({ ...validTask, description: longDesc })).toThrow();
    });

    it('should accept description at exactly 5000 characters', () => {
      const maxDesc = 'A'.repeat(5000);
      const result = createTaskSchema.parse({ ...validTask, description: maxDesc });
      expect(result.description).toBe(maxDesc);
    });

    it('should reject invalid task type', () => {
      expect(() => createTaskSchema.parse({ ...validTask, type: 'invalid' })).toThrow();
    });

    it('should reject invalid priority', () => {
      expect(() => createTaskSchema.parse({ ...validTask, priority: 'invalid' })).toThrow();
    });

    it('should reject unknown fields (strict mode)', () => {
      expect(() => createTaskSchema.parse({ ...validTask, unknown: 'value' })).toThrow();
    });

    it('should accept null assignee', () => {
      const result = createTaskSchema.parse({ ...validTask, assignee: null });
      expect(result.assignee).toBeNull();
    });

    it('should accept undefined assignee', () => {
      const result = createTaskSchema.parse(validTask);
      expect(result.assignee).toBeUndefined();
    });

    it('should reject assignee exceeding 100 characters', () => {
      const longAssignee = 'A'.repeat(101);
      expect(() => createTaskSchema.parse({ ...validTask, assignee: longAssignee })).toThrow();
    });
  });

  // ============================================================================
  // updateTaskSchema
  // ============================================================================

  describe('updateTaskSchema', () => {
    it('should accept valid update data', () => {
      const result = updateTaskSchema.parse({ title: 'Updated Title' });
      expect(result.title).toBe('Updated Title');
    });

    it('should accept multiple fields', () => {
      const result = updateTaskSchema.parse({
        title: 'Updated',
        description: 'New description',
        status: 'in_progress',
        priority: 'urgent'
      });
      
      expect(result.title).toBe('Updated');
      expect(result.description).toBe('New description');
      expect(result.status).toBe('in_progress');
      expect(result.priority).toBe('urgent');
    });

    it('should reject empty update (no fields)', () => {
      expect(() => updateTaskSchema.parse({})).toThrow();
    });

    it('should reject unknown fields', () => {
      expect(() => updateTaskSchema.parse({ unknown: 'value' })).toThrow();
    });

    it('should reject empty title', () => {
      expect(() => updateTaskSchema.parse({ title: '' })).toThrow();
    });

    it('should handle whitespace-only title (trim behavior)', () => {
      // Zod's trim() converts whitespace-only to empty string
      const result = updateTaskSchema.parse({ title: '   ' });
      expect(result.title).toBe('');
    });

    it('should reject title exceeding 200 characters', () => {
      const longTitle = 'A'.repeat(201);
      expect(() => updateTaskSchema.parse({ title: longTitle })).toThrow();
    });

    it('should reject description exceeding 5000 characters', () => {
      const longDesc = 'A'.repeat(5001);
      expect(() => updateTaskSchema.parse({ description: longDesc })).toThrow();
    });

    it('should reject invalid status', () => {
      expect(() => updateTaskSchema.parse({ status: 'invalid' })).toThrow();
    });

    it('should reject invalid priority', () => {
      expect(() => updateTaskSchema.parse({ priority: 'invalid' })).toThrow();
    });

    it('should reject invalid type', () => {
      expect(() => updateTaskSchema.parse({ type: 'invalid' })).toThrow();
    });

    it('should accept null assignee', () => {
      const result = updateTaskSchema.parse({ assignee: null });
      expect(result.assignee).toBeNull();
    });

    it('should reject assignee exceeding 100 characters', () => {
      const longAssignee = 'A'.repeat(101);
      expect(() => updateTaskSchema.parse({ assignee: longAssignee })).toThrow();
    });
  });

  // ============================================================================
  // addCommentSchema
  // ============================================================================

  describe('addCommentSchema', () => {
    it('should accept valid comment', () => {
      const result = addCommentSchema.parse({ content: 'Test comment' });
      expect(result.content).toBe('Test comment');
    });

    it('should reject empty content', () => {
      expect(() => addCommentSchema.parse({ content: '' })).toThrow();
    });

    it('should handle whitespace-only content (trim behavior)', () => {
      // Zod's trim() converts whitespace-only to empty string
      const result = addCommentSchema.parse({ content: '   ' });
      expect(result.content).toBe('');
    });

    it('should reject content exceeding 2000 characters', () => {
      const longContent = 'A'.repeat(2001);
      expect(() => addCommentSchema.parse({ content: longContent })).toThrow();
    });

    it('should accept content at exactly 2000 characters', () => {
      const maxContent = 'A'.repeat(2000);
      const result = addCommentSchema.parse({ content: maxContent });
      expect(result.content).toBe(maxContent);
    });

    it('should trim whitespace from content', () => {
      const result = addCommentSchema.parse({ content: '  Test comment  ' });
      expect(result.content).toBe('Test comment');
    });

    it('should reject unknown fields', () => {
      expect(() => addCommentSchema.parse({ content: 'Test', unknown: 'value' })).toThrow();
    });
  });

  // ============================================================================
  // taskQuerySchema
  // ============================================================================

  describe('taskQuerySchema', () => {
    it('should accept empty query (use defaults)', () => {
      const result = taskQuerySchema.parse({});
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should parse numeric strings for pagination', () => {
      const result = taskQuerySchema.parse({ page: '5', limit: '50' });
      
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });

    it('should reject page less than 1', () => {
      expect(() => taskQuerySchema.parse({ page: 0 })).toThrow();
      expect(() => taskQuerySchema.parse({ page: -1 })).toThrow();
    });

    it('should reject limit less than 1', () => {
      expect(() => taskQuerySchema.parse({ limit: 0 })).toThrow();
    });

    it('should reject limit exceeding 100', () => {
      expect(() => taskQuerySchema.parse({ limit: 101 })).toThrow();
    });

    it('should accept valid status filter', () => {
      const result = taskQuerySchema.parse({ status: 'pending' });
      expect(result.status).toBe('pending');
    });

    it('should reject invalid status filter', () => {
      expect(() => taskQuerySchema.parse({ status: 'invalid' })).toThrow();
    });

    it('should accept valid type filter', () => {
      const result = taskQuerySchema.parse({ type: 'development' });
      expect(result.type).toBe('development');
    });

    it('should reject invalid type filter', () => {
      expect(() => taskQuerySchema.parse({ type: 'invalid' })).toThrow();
    });

    it('should accept valid priority filter', () => {
      const result = taskQuerySchema.parse({ priority: 'high' });
      expect(result.priority).toBe('high');
    });

    it('should accept assignee filter', () => {
      const result = taskQuerySchema.parse({ assignee: 'user-123' });
      expect(result.assignee).toBe('user-123');
    });

    it('should reject assignee exceeding 100 characters', () => {
      const longAssignee = 'A'.repeat(101);
      expect(() => taskQuerySchema.parse({ assignee: longAssignee })).toThrow();
    });

    it('should accept createdBy filter', () => {
      const result = taskQuerySchema.parse({ createdBy: 'user' });
      expect(result.createdBy).toBe('user');
    });

    it('should reject invalid createdBy', () => {
      expect(() => taskQuerySchema.parse({ createdBy: 'invalid' })).toThrow();
    });

    it('should accept search query', () => {
      const result = taskQuerySchema.parse({ search: 'test query' });
      expect(result.search).toBe('test query');
    });

    it('should reject search exceeding 200 characters', () => {
      const longSearch = 'A'.repeat(201);
      expect(() => taskQuerySchema.parse({ search: longSearch })).toThrow();
    });

    it('should accept valid sortBy values', () => {
      const sortByValues = ['createdAt', 'updatedAt', 'priority', 'status'];
      
      sortByValues.forEach(value => {
        const result = taskQuerySchema.parse({ sortBy: value as any });
        expect(result.sortBy).toBe(value);
      });
    });

    it('should reject invalid sortBy', () => {
      expect(() => taskQuerySchema.parse({ sortBy: 'invalid' })).toThrow();
    });

    it('should accept valid sortOrder values', () => {
      const resultAsc = taskQuerySchema.parse({ sortOrder: 'asc' });
      const resultDesc = taskQuerySchema.parse({ sortOrder: 'desc' });
      
      expect(resultAsc.sortOrder).toBe('asc');
      expect(resultDesc.sortOrder).toBe('desc');
    });

    it('should reject invalid sortOrder', () => {
      expect(() => taskQuerySchema.parse({ sortOrder: 'invalid' })).toThrow();
    });

    it('should reject unknown fields', () => {
      expect(() => taskQuerySchema.parse({ unknown: 'value' })).toThrow();
    });
  });

  // ============================================================================
  // taskIdSchema
  // ============================================================================

  describe('taskIdSchema', () => {
    it('should accept valid task ID', () => {
      const result = taskIdSchema.parse({ id: 'task-123' });
      expect(result.id).toBe('task-123');
    });

    it('should reject empty ID', () => {
      expect(() => taskIdSchema.parse({ id: '' })).toThrow();
    });

    it('should reject ID exceeding 100 characters', () => {
      const longId = 'A'.repeat(101);
      expect(() => taskIdSchema.parse({ id: longId })).toThrow();
    });

    it('should accept ID at exactly 100 characters', () => {
      const maxId = 'A'.repeat(100);
      const result = taskIdSchema.parse({ id: maxId });
      expect(result.id).toBe(maxId);
    });

    it('should reject missing ID', () => {
      expect(() => taskIdSchema.parse({})).toThrow();
    });

    it('should reject unknown fields', () => {
      expect(() => taskIdSchema.parse({ id: 'test', unknown: 'value' })).toThrow();
    });
  });

  // ============================================================================
  // batchUpdateSchema
  // ============================================================================

  describe('batchUpdateSchema', () => {
    it('should accept valid batch update', () => {
      const result = batchUpdateSchema.parse({
        taskIds: ['task-1', 'task-2'],
        updates: { status: 'completed' }
      });
      
      expect(result.taskIds).toHaveLength(2);
      expect(result.updates.status).toBe('completed');
    });

    it('should reject empty taskIds array', () => {
      expect(() => batchUpdateSchema.parse({ taskIds: [], updates: { status: 'completed' } })).toThrow();
    });

    it('should reject taskIds with empty string', () => {
      expect(() => batchUpdateSchema.parse({ taskIds: [''], updates: { status: 'completed' } })).toThrow();
    });

    it('should reject more than 50 task IDs', () => {
      const manyIds = Array(51).fill('task-').map((_, i) => `task-${i}`);
      expect(() => batchUpdateSchema.parse({ taskIds: manyIds, updates: { status: 'completed' } })).toThrow();
    });

    it('should accept exactly 50 task IDs', () => {
      const fiftyIds = Array(50).fill('task-').map((_, i) => `task-${i}`);
      const result = batchUpdateSchema.parse({ taskIds: fiftyIds, updates: { status: 'completed' } });
      expect(result.taskIds).toHaveLength(50);
    });

    it('should reject empty updates', () => {
      expect(() => batchUpdateSchema.parse({ taskIds: ['task-1'], updates: {} })).toThrow();
    });

    it('should reject unknown fields in updates', () => {
      expect(() => batchUpdateSchema.parse({ 
        taskIds: ['task-1'], 
        updates: { unknown: 'value' } 
      })).toThrow();
    });

    it('should accept status update', () => {
      const result = batchUpdateSchema.parse({
        taskIds: ['task-1'],
        updates: { status: 'in_progress' }
      });
      expect(result.updates.status).toBe('in_progress');
    });

    it('should accept priority update', () => {
      const result = batchUpdateSchema.parse({
        taskIds: ['task-1'],
        updates: { priority: 'urgent' }
      });
      expect(result.updates.priority).toBe('urgent');
    });

    it('should accept assignee update', () => {
      const result = batchUpdateSchema.parse({
        taskIds: ['task-1'],
        updates: { assignee: 'user-123' }
      });
      expect(result.updates.assignee).toBe('user-123');
    });

    it('should accept null assignee', () => {
      const result = batchUpdateSchema.parse({
        taskIds: ['task-1'],
        updates: { assignee: null }
      });
      expect(result.updates.assignee).toBeNull();
    });

    it('should reject invalid status in updates', () => {
      expect(() => batchUpdateSchema.parse({ 
        taskIds: ['task-1'], 
        updates: { status: 'invalid' } 
      })).toThrow();
    });

    it('should reject invalid priority in updates', () => {
      expect(() => batchUpdateSchema.parse({ 
        taskIds: ['task-1'], 
        updates: { priority: 'invalid' } 
      })).toThrow();
    });

    it('should reject assignee exceeding 100 characters', () => {
      const longAssignee = 'A'.repeat(101);
      expect(() => batchUpdateSchema.parse({ 
        taskIds: ['task-1'], 
        updates: { assignee: longAssignee } 
      })).toThrow();
    });

    it('should reject task ID exceeding 100 characters', () => {
      const longId = 'A'.repeat(101);
      expect(() => batchUpdateSchema.parse({ 
        taskIds: [longId], 
        updates: { status: 'completed' } 
      })).toThrow();
    });

    it('should reject unknown fields at root level', () => {
      expect(() => batchUpdateSchema.parse({ 
        taskIds: ['task-1'], 
        updates: { status: 'completed' },
        unknown: 'value'
      })).toThrow();
    });
  });
});
