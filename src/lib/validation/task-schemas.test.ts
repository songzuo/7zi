/**
 * 任务验证 Schema 测试
 */

import { describe, it, expect } from 'vitest';
import {
  createTaskSchema,
  updateTaskSchema,
  addCommentSchema,
  taskQuerySchema,
  taskIdSchema,
  batchUpdateSchema,
  TaskTypeSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
} from '@/lib/validation/task-schemas';

// ============================================================================
// TaskTypeSchema Tests
// ============================================================================

describe('TaskTypeSchema', () => {
  it('validates valid task types', () => {
    const validTypes = ['development', 'design', 'research', 'marketing', 'other'];
    validTypes.forEach((type) => {
      const result = TaskTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid task types', () => {
    const result = TaskTypeSchema.safeParse('invalid_type');
    expect(result.success).toBe(false);
  });

  it('provides error message for invalid types', () => {
    const result = TaskTypeSchema.safeParse('invalid');
    if (!result.success) {
      expect(result.error.issues[0].message).toBeDefined();
    }
  });
});

// ============================================================================
// TaskPrioritySchema Tests
// ============================================================================

describe('TaskPrioritySchema', () => {
  it('validates valid priorities', () => {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    validPriorities.forEach((priority) => {
      const result = TaskPrioritySchema.safeParse(priority);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid priorities', () => {
    const result = TaskPrioritySchema.safeParse('critical');
    expect(result.success).toBe(false);
  });

  it('provides error message for invalid priorities', () => {
    const result = TaskPrioritySchema.safeParse('unknown');
    if (!result.success) {
      expect(result.error.issues[0].message).toBeDefined();
    }
  });
});

// ============================================================================
// TaskStatusSchema Tests
// ============================================================================

describe('TaskStatusSchema', () => {
  it('validates valid statuses', () => {
    const validStatuses = ['pending', 'assigned', 'in_progress', 'completed'];
    validStatuses.forEach((status) => {
      const result = TaskStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid statuses', () => {
    const result = TaskStatusSchema.safeParse('cancelled');
    expect(result.success).toBe(false);
  });

  it('provides error message for invalid statuses', () => {
    const result = TaskStatusSchema.safeParse('unknown');
    if (!result.success) {
      expect(result.error.issues[0].message).toBeDefined();
    }
  });
});

// ============================================================================
// createTaskSchema Tests
// ============================================================================

describe('createTaskSchema', () => {
  it('validates a complete valid task', () => {
    const result = createTaskSchema.safeParse({
      title: 'Test Task',
      description: 'Test description',
      type: 'development',
      priority: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('validates task with only required fields', () => {
    const result = createTaskSchema.safeParse({
      title: 'Minimal Task',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Minimal Task');
      expect(result.data.type).toBe('other'); // default
      expect(result.data.priority).toBe('medium'); // default
    }
  });

  it('rejects empty title', () => {
    const result = createTaskSchema.safeParse({
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 200 characters', () => {
    const result = createTaskSchema.safeParse({
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from title', () => {
    const result = createTaskSchema.safeParse({
      title: '  Trimmed Title  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Trimmed Title');
    }
  });

  it('rejects description exceeding 5000 characters', () => {
    const result = createTaskSchema.safeParse({
      title: 'Test',
      description: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts nullable assignee', () => {
    const result = createTaskSchema.safeParse({
      title: 'Test',
      assignee: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = createTaskSchema.safeParse({
      title: 'Test',
      unknownField: 'value',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateTaskSchema Tests
// ============================================================================

describe('updateTaskSchema', () => {
  it('validates partial updates', () => {
    const result = updateTaskSchema.safeParse({
      title: 'Updated Title',
    });
    expect(result.success).toBe(true);
  });

  it('validates multiple field updates', () => {
    const result = updateTaskSchema.safeParse({
      title: 'Updated',
      status: 'in_progress',
      priority: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty update object', () => {
    const result = updateTaskSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('至少需要提供一个更新字段');
    }
  });

  it('rejects empty title in update', () => {
    const result = updateTaskSchema.safeParse({
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = updateTaskSchema.safeParse({
      unknownField: 'value',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// addCommentSchema Tests
// ============================================================================

describe('addCommentSchema', () => {
  it('validates valid comment', () => {
    const result = addCommentSchema.safeParse({
      content: 'This is a comment',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty comment', () => {
    const result = addCommentSchema.safeParse({
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects comment exceeding 2000 characters', () => {
    const result = addCommentSchema.safeParse({
      content: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from content', () => {
    const result = addCommentSchema.safeParse({
      content: '  Trimmed comment  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Trimmed comment');
    }
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = addCommentSchema.safeParse({
      content: 'Test',
      unknownField: 'value',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// taskQuerySchema Tests
// ============================================================================

describe('taskQuerySchema', () => {
  it('validates empty query with defaults', () => {
    const result = taskQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe('createdAt');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('validates complete query parameters', () => {
    const result = taskQuerySchema.safeParse({
      status: 'pending',
      type: 'development',
      priority: 'high',
      assignee: 'user123',
      createdBy: 'ai',
      search: 'test',
      page: 2,
      limit: 50,
      sortBy: 'updatedAt',
      sortOrder: 'asc',
    });
    expect(result.success).toBe(true);
  });

  it('coerces page and limit to numbers', () => {
    const result = taskQuerySchema.safeParse({
      page: '5',
      limit: '30',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.limit).toBe(30);
    }
  });

  it('rejects limit exceeding 100', () => {
    const result = taskQuerySchema.safeParse({
      limit: 150,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid sortBy value', () => {
    const result = taskQuerySchema.safeParse({
      sortBy: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = taskQuerySchema.safeParse({
      unknownField: 'value',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// taskIdSchema Tests
// ============================================================================

describe('taskIdSchema', () => {
  it('validates valid task ID', () => {
    const result = taskIdSchema.safeParse({
      id: 'task_123456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty ID', () => {
    const result = taskIdSchema.safeParse({
      id: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects ID exceeding 100 characters', () => {
    const result = taskIdSchema.safeParse({
      id: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// batchUpdateSchema Tests
// ============================================================================

describe('batchUpdateSchema', () => {
  it('validates valid batch update', () => {
    const result = batchUpdateSchema.safeParse({
      taskIds: ['task_1', 'task_2'],
      updates: {
        status: 'completed',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty taskIds array', () => {
    const result = batchUpdateSchema.safeParse({
      taskIds: [],
      updates: {
        status: 'completed',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 50 taskIds', () => {
    const result = batchUpdateSchema.safeParse({
      taskIds: Array(51).fill('task'),
      updates: {
        status: 'completed',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty updates object', () => {
    const result = batchUpdateSchema.safeParse({
      taskIds: ['task_1'],
      updates: {},
    });
    expect(result.success).toBe(false);
  });

  it('accepts multiple update fields', () => {
    const result = batchUpdateSchema.safeParse({
      taskIds: ['task_1'],
      updates: {
        status: 'in_progress',
        priority: 'high',
        assignee: 'user123',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields in updates (strict mode)', () => {
    const result = batchUpdateSchema.safeParse({
      taskIds: ['task_1'],
      updates: {
        unknownField: 'value',
      },
    });
    expect(result.success).toBe(false);
  });
});