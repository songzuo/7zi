/**
 * Tests for Query Optimizations Module
 * Tests optimized query helpers for performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOptimizedFeedbackStats,
  getOptimizedRatingStats,
  batchLoad,
  paginate,
  getFeedbacksWithAttachments,
  getRatingWithVotes,
  getFeedbackStatsByStatuses,
  getRatingStatsByValues,
} from '../query-optimizations';
import type { DatabaseConnection } from '../index';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('getOptimizedFeedbackStats', () => {
  let mockDb: DatabaseConnection;

  beforeEach(() => {
    mockDb = {
      queryRows: vi.fn(),
      query: vi.fn(),
      exec: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: undefined }),
      prepare: vi.fn(),
      pragma: vi.fn(),
      getConnection: vi.fn(),
      batch: vi.fn(),
    } as unknown as DatabaseConnection;
  });

  it('should return complete feedback statistics', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValueOnce([{
      total: 100,
      avg_rating: 3.8,
      status_pending: 10,
      status_reviewed: 20,
      status_approved: 50,
      status_rejected: 15,
      status_resolved: 5,
      type_general: 20,
      type_bug: 30,
      type_feature: 25,
      type_suggestion: 15,
      type_complaint: 8,
      type_compliment: 2,
      type_other: 0,
      priority_low: 20,
      priority_medium: 50,
      priority_high: 25,
      priority_urgent: 5,
      rating_1: 5,
      rating_2: 10,
      rating_3: 25,
      rating_4: 40,
      rating_5: 20,
    }]);

    const stats = await getOptimizedFeedbackStats(mockDb);

    expect(stats.total).toBe(100);
    expect(stats.by_status).toEqual({
      pending: 10,
      reviewed: 20,
      approved: 50,
      rejected: 15,
      resolved: 5,
    });
    expect(stats.by_type).toEqual({
      general: 20,
      bug: 30,
      feature: 25,
      suggestion: 15,
      complaint: 8,
      compliment: 2,
      other: 0,
    });
    expect(stats.by_priority).toEqual({
      low: 20,
      medium: 50,
      high: 25,
      urgent: 5,
    });
    expect(stats.average_rating).toBe(3.8);
    expect(stats.rating_distribution).toEqual({
      1: 5,
      2: 10,
      3: 25,
      4: 40,
      5: 20,
    });
  });

  it('should handle null average rating', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValueOnce([{
      total: 0,
      avg_rating: null,
      status_pending: 0,
      status_reviewed: 0,
      status_approved: 0,
      status_rejected: 0,
      status_resolved: 0,
      type_general: 0,
      type_bug: 0,
      type_feature: 0,
      type_suggestion: 0,
      type_complaint: 0,
      type_compliment: 0,
      type_other: 0,
      priority_low: 0,
      priority_medium: 0,
      priority_high: 0,
      priority_urgent: 0,
      rating_1: 0,
      rating_2: 0,
      rating_3: 0,
      rating_4: 0,
      rating_5: 0,
    }]);

    const stats = await getOptimizedFeedbackStats(mockDb);

    expect(stats.total).toBe(0);
    expect(stats.average_rating).toBe(0);
  });

  it('should use single optimized query', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValueOnce([{
      total: 50,
      avg_rating: 4.0,
      status_pending: 5,
      status_reviewed: 10,
      status_approved: 25,
      status_rejected: 8,
      status_resolved: 2,
      type_general: 10,
      type_bug: 15,
      type_feature: 12,
      type_suggestion: 8,
      type_complaint: 4,
      type_compliment: 1,
      type_other: 0,
      priority_low: 10,
      priority_medium: 25,
      priority_high: 12,
      priority_urgent: 3,
      rating_1: 2,
      rating_2: 5,
      rating_3: 10,
      rating_4: 18,
      rating_5: 15,
    }]);

    await getOptimizedFeedbackStats(mockDb);

    expect(mockDb.queryRows).toHaveBeenCalledTimes(1);
    expect((mockDb.queryRows as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('COUNT(*) as total');
    expect((mockDb.queryRows as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('AVG(rating) as avg_rating');
  });

  it('should round average rating to one decimal place', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValueOnce([{
      total: 10,
      avg_rating: 3.856,
      status_pending: 2,
      status_reviewed: 2,
      status_approved: 4,
      status_rejected: 2,
      status_resolved: 0,
      type_general: 2,
      type_bug: 3,
      type_feature: 2,
      type_suggestion: 2,
      type_complaint: 1,
      type_compliment: 0,
      type_other: 0,
      priority_low: 2,
      priority_medium: 5,
      priority_high: 2,
      priority_urgent: 1,
      rating_1: 1,
      rating_2: 1,
      rating_3: 2,
      rating_4: 3,
      rating_5: 3,
    }]);

    const stats = await getOptimizedFeedbackStats(mockDb);

    expect(stats.average_rating).toBe(3.9);
  });
});

describe('getOptimizedRatingStats', () => {
  let mockDb: DatabaseConnection;

  beforeEach(() => {
    mockDb = {
      queryRows: vi.fn(),
      query: vi.fn(),
      exec: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: undefined }),
      prepare: vi.fn(),
      pragma: vi.fn(),
      getConnection: vi.fn(),
      batch: vi.fn(),
    } as unknown as DatabaseConnection;
  });

  it('should return complete rating statistics without filters', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([{
        total: 200,
        avg_rating: 4.2,
        rating_1: 5,
        rating_2: 10,
        rating_3: 20,
        rating_4: 60,
        rating_5: 105,
      }])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 80 },
        { target_type: 'task', count: 70 },
        { target_type: 'feature', count: 30 },
        { target_type: 'project', count: 20 },
      ])
      .mockReturnValueOnce([{
        helpful: 150,
        not_helpful: 50,
      }]);

    const stats = await getOptimizedRatingStats(mockDb);

    expect(stats.total).toBe(200);
    expect(stats.average_rating).toBe(4.2);
    expect(stats.rating_distribution).toEqual({
      1: 5,
      2: 10,
      3: 20,
      4: 60,
      5: 105,
    });
    expect(stats.by_target_type).toEqual({
      agent: 80,
      task: 70,
      feature: 30,
      project: 20,
    });
    expect(stats.helpful_ratio).toBeCloseTo(0.75);
  });

  it('should filter by target_type', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([{
        total: 50,
        avg_rating: 4.5,
        rating_1: 0,
        rating_2: 0,
        rating_3: 10,
        rating_4: 20,
        rating_5: 20,
      }])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 80 },
        { target_type: 'task', count: 70 },
      ])
      .mockReturnValueOnce([{
        helpful: 40,
        not_helpful: 10,
      }]);

    const stats = await getOptimizedRatingStats(mockDb, { target_type: 'agent' });

    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('WHERE target_type = ?'),
      ['agent']
    );
    expect(stats.total).toBe(50);
  });

  it('should filter by target_type and target_id', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([{
        total: 10,
        avg_rating: 4.8,
        rating_1: 0,
        rating_2: 0,
        rating_3: 2,
        rating_4: 2,
        rating_5: 6,
      }])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 80 },
        { target_type: 'task', count: 70 },
      ])
      .mockReturnValueOnce([{
        helpful: 8,
        not_helpful: 2,
      }]);

    const stats = await getOptimizedRatingStats(mockDb, {
      target_type: 'agent',
      target_id: 'agent-123',
    });

    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('WHERE target_type = ? AND target_id = ?'),
      ['agent', 'agent-123']
    );
    expect(stats.total).toBe(10);
  });

  it('should handle null average rating', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([{
        total: 0,
        avg_rating: null,
        rating_1: 0,
        rating_2: 0,
        rating_3: 0,
        rating_4: 0,
        rating_5: 0,
      }])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{
        helpful: 0,
        not_helpful: 0,
      }]);

    const stats = await getOptimizedRatingStats(mockDb);

    expect(stats.total).toBe(0);
    expect(stats.average_rating).toBe(0);
    expect(stats.by_target_type).toEqual({});
  });

  it('should calculate helpful ratio correctly', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([{
        total: 100,
        avg_rating: 4.0,
        rating_1: 0,
        rating_2: 0,
        rating_3: 0,
        rating_4: 0,
        rating_5: 100,
      }])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 100 },
      ])
      .mockReturnValueOnce([{
        helpful: 90,
        not_helpful: 10,
      }]);

    const stats = await getOptimizedRatingStats(mockDb);

    expect(stats.helpful_ratio).toBeCloseTo(0.9);
  });

  it('should handle no votes', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([{
        total: 50,
        avg_rating: 4.0,
        rating_1: 0,
        rating_2: 0,
        rating_3: 10,
        rating_4: 20,
        rating_5: 20,
      }])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 50 },
      ])
      .mockReturnValueOnce([{
        helpful: 0,
        not_helpful: 0,
      }]);

    const stats = await getOptimizedRatingStats(mockDb);

    expect(stats.helpful_ratio).toBe(0);
  });
});

describe('batchLoad', () => {
  let mockDb: DatabaseConnection;

  beforeEach(() => {
    mockDb = {
      queryRows: vi.fn(),
      query: vi.fn(),
      exec: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: undefined }),
      prepare: vi.fn(),
      pragma: vi.fn(),
      getConnection: vi.fn(),
      batch: vi.fn(),
    } as unknown as DatabaseConnection;
  });

  it('should load items in single batch', async () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ];
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue(items);

    const result = await batchLoad(mockDb, 'test_table', ['1', '2', '3']);

    expect(result).toEqual(items);
    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id IN (?, ?, ?)'),
      ['1', '2', '3']
    );
  });

  it('should handle empty id list', async () => {
    const result = await batchLoad(mockDb, 'test_table', []);

    expect(result).toEqual([]);
    expect(mockDb.queryRows).not.toHaveBeenCalled();
  });

  it('should split into batches for large id lists', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => String(i + 1));
    const items = ids.map(id => ({ id, name: `Item ${id}` }));
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue(items);

    const result = await batchLoad(mockDb, 'test_table', ids);

    expect(result).toHaveLength(250);
    expect(mockDb.queryRows).toHaveBeenCalledTimes(3); // 100 + 100 + 50
  });

  it('should use custom id column', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { user_id: '1', name: 'User 1' },
    ]);

    batchLoad(mockDb, 'users', ['1', '2'], 'user_id');

    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id IN'),
      ['1', '2']
    );
  });
});

describe('paginate', () => {
  let mockDb: DatabaseConnection;

  beforeEach(() => {
    mockDb = {
      queryRows: vi.fn(),
      query: vi.fn(),
      exec: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: undefined }),
      prepare: vi.fn(),
      pragma: vi.fn(),
      getConnection: vi.fn(),
      batch: vi.fn(),
    } as unknown as DatabaseConnection;
  });

  it('should return paginated results', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: '1', name: 'Item 1', total_count: 100 },
      { id: '2', name: 'Item 2', total_count: 100 },
    ]);

    const result = await paginate(mockDb, 'test_table', 1, 20);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: '1', name: 'Item 1' });
    expect(result.total).toBe(100);
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(20);
    expect(result.total_pages).toBe(5);
  });

  it('should calculate total pages correctly', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: '1', name: 'Item 1', total_count: 45 },
    ]);

    const result = await paginate(mockDb, 'test_table', 1, 20);

    expect(result.total_pages).toBe(3); // Math.ceil(45/20) = 3
  });

  it('should handle zero results', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const result = await paginate(mockDb, 'test_table', 1, 20);

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.total_pages).toBe(0);
  });

  it('should use default limit and page', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: '1', name: 'Item 1', total_count: 10 },
    ]);

    paginate(mockDb, 'test_table');

    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT ? OFFSET ?'),
      [20, 0]
    );
  });

  it('should include WHERE clause and params', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: '1', name: 'Item 1', total_count: 5 },
    ]);

    paginate(mockDb, 'test_table', 1, 10, 'status = ?', ['active'], 'created_at DESC');

    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('WHERE status = ?'),
      ['active', 10, 0]
    );
  });

  it('should strip total_count from items', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: '1', name: 'Item 1', total_count: 100 },
      { id: '2', name: 'Item 2', total_count: 100 },
    ]);

    const result = await paginate(mockDb, 'test_table', 1, 20);

    expect(result.items[0]).not.toHaveProperty('total_count');
    expect(result.items[1]).not.toHaveProperty('total_count');
  });
});

describe('getFeedbacksWithAttachments', () => {
  let mockDb: DatabaseConnection;

  beforeEach(() => {
    mockDb = {
      queryRows: vi.fn(),
      query: vi.fn(),
      exec: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: undefined }),
      prepare: vi.fn(),
      pragma: vi.fn(),
      getConnection: vi.fn(),
      batch: vi.fn(),
    } as unknown as DatabaseConnection;
  });

  it('should return grouped attachments', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { feedback_id: 'fb1', id: 'att1', filename: 'file1.jpg' },
      { feedback_id: 'fb1', id: 'att2', filename: 'file2.jpg' },
      { feedback_id: 'fb2', id: 'att3', filename: 'file3.jpg' },
    ]);

    const result = await getFeedbacksWithAttachments(mockDb, ['fb1', 'fb2']);

    expect(result.size).toBe(2);
    expect(result.get('fb1')).toHaveLength(2);
    expect(result.get('fb2')).toHaveLength(1);
  });

  it('should handle empty feedback id list', async () => {
    const result = await getFeedbacksWithAttachments(mockDb, []);

    expect(result.size).toBe(0);
    expect(mockDb.queryRows).not.toHaveBeenCalled();
  });

  it('should use single query for all attachments', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([]);

    getFeedbacksWithAttachments(mockDb, ['fb1', 'fb2', 'fb3']);

    expect(mockDb.queryRows).toHaveBeenCalledTimes(1);
    // Implementation uses string interpolation with join, so values are directly in query
    expect(mockDb.queryRows).toHaveBeenCalledWith(
      "SELECT * FROM feedback_attachments WHERE feedback_id IN (?,?,?) ORDER BY feedback_id, uploaded_at",
      ['fb1', 'fb2', 'fb3']
    );
  });
});

describe('getRatingWithVotes', () => {
  let mockDb: DatabaseConnection;

  beforeEach(() => {
    mockDb = {
      queryRows: vi.fn(),
      query: vi.fn(),
      exec: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: undefined }),
      prepare: vi.fn(),
      pragma: vi.fn(),
      getConnection: vi.fn(),
      batch: vi.fn(),
    } as unknown as DatabaseConnection;
  });

  it('should return grouped votes', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { rating_id: 'r1', user_id: 'u1', is_helpful: 1 },
      { rating_id: 'r1', user_id: 'u2', is_helpful: 0 },
      { rating_id: 'r2', user_id: 'u3', is_helpful: 1 },
    ]);

    const result = await getRatingWithVotes(mockDb, ['r1', 'r2']);

    expect(result.size).toBe(2);
    expect(result.get('r1')).toHaveLength(2);
    expect(result.get('r2')).toHaveLength(1);
  });

  it('should handle empty rating id list', async () => {
    const result = await getRatingWithVotes(mockDb, []);

    expect(result.size).toBe(0);
    expect(mockDb.queryRows).not.toHaveBeenCalled();
  });

  it('should use single query for all votes', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([]);

    getRatingWithVotes(mockDb, ['r1', 'r2']);

    expect(mockDb.queryRows).toHaveBeenCalledTimes(1);
    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('WHERE rating_id IN'),
      ['r1', 'r2']
    );
  });
});

describe('getFeedbackStatsByStatuses', () => {
  let mockDb: DatabaseConnection;

  beforeEach(() => {
    mockDb = {
      queryRows: vi.fn(),
      query: vi.fn(),
      exec: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: undefined }),
      prepare: vi.fn(),
      pragma: vi.fn(),
      getConnection: vi.fn(),
      batch: vi.fn(),
    } as unknown as DatabaseConnection;
  });

  it('should return stats for specified statuses', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { status: 'pending', count: 10 },
      { status: 'approved', count: 50 },
    ]);

    const result = await getFeedbackStatsByStatuses(mockDb, ['pending', 'approved']);

    expect(result).toEqual({
      pending: 10,
      approved: 50,
    });
  });

  it('should handle empty status list', async () => {
    const result = await getFeedbackStatsByStatuses(mockDb, []);

    expect(result).toEqual({});
    expect(mockDb.queryRows).not.toHaveBeenCalled();
  });

  it('should use single query with IN clause', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await getFeedbackStatsByStatuses(mockDb, ['pending', 'approved', 'rejected']);

    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining("WHERE status IN")
    );
  });

  it('should handle statuses with no results', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { status: 'pending', count: 5 },
    ]);

    const result = await getFeedbackStatsByStatuses(mockDb, ['pending', 'approved']);

    expect(result).toEqual({
      pending: 5,
    });
  });
});

describe('getRatingStatsByValues', () => {
  let mockDb: DatabaseConnection;

  beforeEach(() => {
    mockDb = {
      queryRows: vi.fn(),
      query: vi.fn(),
      exec: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: undefined }),
      prepare: vi.fn(),
      pragma: vi.fn(),
      getConnection: vi.fn(),
      batch: vi.fn(),
    } as unknown as DatabaseConnection;
  });

  it('should return stats for specified rating values', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { rating: 4, count: 40 },
      { rating: 5, count: 60 },
    ]);

    const result = await getRatingStatsByValues(mockDb, [4, 5]);

    expect(result).toEqual({
      4: 40,
      5: 60,
    });
  });

  it('should handle empty rating list', async () => {
    const result = await getRatingStatsByValues(mockDb, []);

    expect(result).toEqual({});
    expect(mockDb.queryRows).not.toHaveBeenCalled();
  });

  it('should use single query with IN clause', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await getRatingStatsByValues(mockDb, [1, 2, 3, 4, 5]);

    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('WHERE rating IN')
    );
  });

  it('should return Record<number, number> type', async () => {
    (mockDb.queryRows as ReturnType<typeof vi.fn>).mockReturnValue([
      { rating: 5, count: 100 },
    ]);

    const result = await getRatingStatsByValues(mockDb, [5]);

    expect(result[5]).toBe(100);
  });
});
