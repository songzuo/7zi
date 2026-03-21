/**
 * Tests for Feedback Module
 * Tests feedback table initialization and statistics functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock database
const mockQueryRows = vi.fn();
const mockExec = vi.fn();
const mockPrepare = vi.fn();

const mockDb = {
  queryRows: mockQueryRows,
  query: vi.fn(),
  exec: mockExec,
  prepare: mockPrepare,
  pragma: vi.fn(),
  getConnection: vi.fn(),
  batch: vi.fn(),
};

vi.mock('../index', () => ({
  getDatabaseAsync: vi.fn().mockResolvedValue(mockDb),
}));

// Import after mocks are set up
const feedbackModule = await import('../feedback');
const initializeFeedbackTables = feedbackModule.initializeFeedbackTables;
const getFeedbackStatistics = feedbackModule.getFeedbackStatistics;
const getRatingStatistics = feedbackModule.getRatingStatistics;

describe('initializeFeedbackTables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize all feedback tables', async () => {
    await initializeFeedbackTables();

    // Check that exec was called (creates tables and indexes)
    expect(mockExec).toHaveBeenCalled();
    expect(mockExec.mock.calls.length).toBeGreaterThanOrEqual(20);
  });

  it('should create feedbacks table with correct schema', async () => {
    await initializeFeedbackTables();

    const feedbacksCalls = mockExec.mock.calls.filter(call =>
      call[0].includes('CREATE TABLE IF NOT EXISTS feedbacks')
    );

    expect(feedbacksCalls.length).toBeGreaterThan(0);
    expect(feedbacksCalls[0][0]).toContain('id TEXT PRIMARY KEY');
    expect(feedbacksCalls[0][0]).toContain('user_id TEXT NOT NULL');
    expect(feedbacksCalls[0][0]).toContain('type TEXT NOT NULL');
    expect(feedbacksCalls[0][0]).toContain('rating INTEGER NOT NULL');
    expect(feedbacksCalls[0][0]).toContain('status TEXT NOT NULL');
  });

  it('should create ratings table with correct schema', async () => {
    await initializeFeedbackTables();

    const ratingsCalls = mockExec.mock.calls.filter(call =>
      call[0].includes('CREATE TABLE IF NOT EXISTS ratings')
    );

    expect(ratingsCalls.length).toBeGreaterThan(0);
    expect(ratingsCalls[0][0]).toContain('id TEXT PRIMARY KEY');
    expect(ratingsCalls[0][0]).toContain('user_id TEXT NOT NULL');
    expect(ratingsCalls[0][0]).toContain('target_type TEXT NOT NULL');
    expect(ratingsCalls[0][0]).toContain('target_id TEXT NOT NULL');
    expect(ratingsCalls[0][0]).toContain('rating INTEGER NOT NULL');
  });

  it('should create feedback_attachments table', async () => {
    await initializeFeedbackTables();

    const calls = mockExec.mock.calls.filter(call =>
      call[0].includes('CREATE TABLE IF NOT EXISTS feedback_attachments')
    );

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toContain('feedback_id TEXT NOT NULL');
    expect(calls[0][0]).toContain('FOREIGN KEY');
  });

  it('should create helpful_votes table', async () => {
    await initializeFeedbackTables();

    const calls = mockExec.mock.calls.filter(call =>
      call[0].includes('CREATE TABLE IF NOT EXISTS helpful_votes')
    );

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toContain('rating_id TEXT NOT NULL');
    expect(calls[0][0]).toContain('user_id TEXT NOT NULL');
    expect(calls[0][0]).toContain('UNIQUE(rating_id, user_id)');
  });

  it('should create spam_detection_logs table', async () => {
    await initializeFeedbackTables();

    const calls = mockExec.mock.calls.filter(call =>
      call[0].includes('CREATE TABLE IF NOT EXISTS spam_detection_logs')
    );

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toContain('content TEXT NOT NULL');
    expect(calls[0][0]).toContain('is_spam INTEGER NOT NULL');
  });

  it('should create feedback_notifications table', async () => {
    await initializeFeedbackTables();

    const calls = mockExec.mock.calls.filter(call =>
      call[0].includes('CREATE TABLE IF NOT EXISTS feedback_notifications')
    );

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toContain('feedback_id TEXT NOT NULL');
    expect(calls[0][0]).toContain('recipient_id TEXT NOT NULL');
    expect(calls[0][0]).toContain('type TEXT NOT NULL');
  });

  it('should create indexes for feedbacks table', async () => {
    await initializeFeedbackTables();

    const indexCalls = mockExec.mock.calls.filter(call =>
      call[0].includes('CREATE INDEX') && call[0].includes('feedbacks')
    );

    expect(indexCalls.length).toBeGreaterThanOrEqual(6);
    expect(indexCalls.some(call => call[0].includes('idx_feedbacks_user_id'))).toBe(true);
    expect(indexCalls.some(call => call[0].includes('idx_feedbacks_status'))).toBe(true);
    expect(indexCalls.some(call => call[0].includes('idx_feedbacks_type'))).toBe(true);
  });

  it('should create indexes for ratings table', async () => {
    await initializeFeedbackTables();

    const indexCalls = mockExec.mock.calls.filter(call =>
      call[0].includes('CREATE INDEX') && call[0].includes('ratings')
    );

    expect(indexCalls.length).toBeGreaterThanOrEqual(4);
    expect(indexCalls.some(call => call[0].includes('idx_ratings_user_id'))).toBe(true);
    expect(indexCalls.some(call => call[0].includes('idx_ratings_target'))).toBe(true);
  });
});

describe('getFeedbackStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return complete feedback statistics', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 100 }]) // total
      .mockReturnValueOnce([
        { status: 'pending', count: 10 },
        { status: 'reviewed', count: 20 },
        { status: 'approved', count: 50 },
        { status: 'rejected', count: 15 },
        { status: 'resolved', count: 5 },
      ]) // by status
      .mockReturnValueOnce([
        { type: 'bug', count: 30 },
        { type: 'feature', count: 25 },
        { type: 'general', count: 20 },
        { type: 'suggestion', count: 15 },
        { type: 'complaint', count: 8 },
        { type: 'compliment', count: 2 },
      ]) // by type
      .mockReturnValueOnce([
        { priority: 'low', count: 20 },
        { priority: 'medium', count: 50 },
        { priority: 'high', count: 25 },
        { priority: 'urgent', count: 5 },
      ]) // by priority
      .mockReturnValueOnce([{ avg: 3.8 }]) // average rating
      .mockReturnValueOnce([
        { rating: 1, count: 5 },
        { rating: 2, count: 10 },
        { rating: 3, count: 25 },
        { rating: 4, count: 40 },
        { rating: 5, count: 20 },
      ]); // rating distribution

    const stats = await getFeedbackStatistics();

    expect(stats.total).toBe(100);
    expect(stats.by_status).toEqual({
      pending: 10,
      reviewed: 20,
      approved: 50,
      rejected: 15,
      resolved: 5,
    });
    expect(stats.by_type).toEqual({
      bug: 30,
      feature: 25,
      general: 20,
      suggestion: 15,
      complaint: 8,
      compliment: 2,
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

  it('should handle zero feedbacks', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 0 }])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ avg: null }])
      .mockReturnValueOnce([]);

    const stats = await getFeedbackStatistics();

    expect(stats.total).toBe(0);
    expect(stats.by_status).toEqual({});
    expect(stats.by_type).toEqual({});
    expect(stats.by_priority).toEqual({});
    expect(stats.average_rating).toBe(0);
    expect(stats.rating_distribution).toEqual({
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    });
  });

  it('should round average rating to one decimal place', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 10 }])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ avg: 3.856 }])
      .mockReturnValueOnce([]);

    const stats = await getFeedbackStatistics();

    expect(stats.average_rating).toBe(3.9);
  });

  it('should make correct database queries', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 50 }])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ avg: 4.0 }])
      .mockReturnValueOnce([]);

    await getFeedbackStatistics();

    expect(mockQueryRows).toHaveBeenCalledWith(
      'SELECT COUNT(*) as count FROM feedbacks'
    );
    expect(mockQueryRows).toHaveBeenCalledWith(
      'SELECT status, COUNT(*) as count FROM feedbacks GROUP BY status'
    );
    expect(mockQueryRows).toHaveBeenCalledWith(
      'SELECT type, COUNT(*) as count FROM feedbacks GROUP BY type'
    );
    expect(mockQueryRows).toHaveBeenCalledWith(
      'SELECT priority, COUNT(*) as count FROM feedbacks GROUP BY priority'
    );
    expect(mockQueryRows).toHaveBeenCalledWith(
      'SELECT AVG(rating) as avg FROM feedbacks'
    );
    expect(mockQueryRows).toHaveBeenCalledWith(
      'SELECT rating, COUNT(*) as count FROM feedbacks GROUP BY rating ORDER BY rating'
    );
  });
});

describe('getRatingStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return complete rating statistics without filters', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 200 }]) // total
      .mockReturnValueOnce([{ avg: 4.2 }]) // average rating
      .mockReturnValueOnce([
        { rating: 1, count: 5 },
        { rating: 2, count: 10 },
        { rating: 3, count: 20 },
        { rating: 4, count: 60 },
        { rating: 5, count: 105 },
      ]) // rating distribution
      .mockReturnValueOnce([
        { target_type: 'agent', count: 80 },
        { target_type: 'task', count: 70 },
        { target_type: 'feature', count: 30 },
        { target_type: 'project', count: 20 },
      ]) // by target type
      .mockReturnValueOnce([{ count: 150 }]) // helpful votes
      .mockReturnValueOnce([{ count: 50 }]); // not helpful votes

    const stats = await getRatingStatistics();

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
    mockQueryRows
      .mockReturnValueOnce([{ count: 50 }])
      .mockReturnValueOnce([{ avg: 4.5 }])
      .mockReturnValueOnce([
        { rating: 4, count: 20 },
        { rating: 5, count: 30 },
      ])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 80 },
        { target_type: 'task', count: 70 },
      ])
      .mockReturnValueOnce([{ count: 40 }])
      .mockReturnValueOnce([{ count: 10 }]);

    const stats = await getRatingStatistics({ target_type: 'agent' });

    expect(mockQueryRows).toHaveBeenCalledWith(
      expect.stringContaining('WHERE target_type = ?'),
      ['agent']
    );
    expect(stats.total).toBe(50);
  });

  it('should filter by target_type and target_id', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 10 }])
      .mockReturnValueOnce([{ avg: 4.8 }])
      .mockReturnValueOnce([
        { rating: 4, count: 2 },
        { rating: 5, count: 8 },
      ])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 80 },
        { target_type: 'task', count: 70 },
      ])
      .mockReturnValueOnce([{ count: 8 }])
      .mockReturnValueOnce([{ count: 2 }]);

    const stats = await getRatingStatistics({
      target_type: 'agent',
      target_id: 'agent-123',
    });

    expect(mockQueryRows).toHaveBeenCalledWith(
      expect.stringContaining('WHERE target_type = ? AND target_id = ?'),
      ['agent', 'agent-123']
    );
    expect(stats.total).toBe(10);
  });

  it('should handle zero ratings', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 0 }])
      .mockReturnValueOnce([{ avg: null }])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ count: 0 }])
      .mockReturnValueOnce([{ count: 0 }]);

    const stats = await getRatingStatistics();

    expect(stats.total).toBe(0);
    expect(stats.average_rating).toBe(0);
    expect(stats.rating_distribution).toEqual({
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    });
    expect(stats.by_target_type).toEqual({});
    expect(stats.helpful_ratio).toBe(0);
  });

  it('should calculate helpful ratio correctly', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 100 }])
      .mockReturnValueOnce([{ avg: 4.0 }])
      .mockReturnValueOnce([
        { rating: 5, count: 100 },
      ])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 100 },
      ])
      .mockReturnValueOnce([{ count: 90 }])
      .mockReturnValueOnce([{ count: 10 }]);

    const stats = await getRatingStatistics();

    expect(stats.helpful_ratio).toBeCloseTo(0.9);
  });

  it('should handle no votes', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 50 }])
      .mockReturnValueOnce([{ avg: 4.0 }])
      .mockReturnValueOnce([
        { rating: 4, count: 25 },
        { rating: 5, count: 25 },
      ])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 50 },
      ])
      .mockReturnValueOnce([{ count: 0 }])
      .mockReturnValueOnce([{ count: 0 }]);

    const stats = await getRatingStatistics();

    expect(stats.helpful_ratio).toBe(0);
  });

  it('should round average rating to one decimal place', async () => {
    mockQueryRows
      .mockReturnValueOnce([{ count: 10 }])
      .mockReturnValueOnce([{ avg: 4.234 }])
      .mockReturnValueOnce([
        { rating: 4, count: 5 },
        { rating: 5, count: 5 },
      ])
      .mockReturnValueOnce([
        { target_type: 'agent', count: 10 },
      ])
      .mockReturnValueOnce([{ count: 8 }])
      .mockReturnValueOnce([{ count: 2 }]);

    const stats = await getRatingStatistics();

    expect(stats.average_rating).toBe(4.2);
  });
});
