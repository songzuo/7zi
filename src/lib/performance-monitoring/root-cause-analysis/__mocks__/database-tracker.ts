/**
 * Mock for database-tracker
 */

import { vi } from 'vitest';

export const DatabaseTracker = vi.fn().mockImplementation(() => ({
  trackQuery: vi.fn().mockReturnValue('query-id-123'),
  getHistory: vi.fn().mockReturnValue([]),
  analyze: vi.fn().mockReturnValue({
    queryStatistics: {
      totalQueries: 0,
      averageDuration: 0,
      slowQueries: 0,
      errorQueries: 0,
      topSlowQueries: []
    },
    criticalIssues: []
  }),
  clearHistory: vi.fn(),
  updateConfig: vi.fn()
}));

export const DatabaseQueryMock = {
  id: 'query-1',
  query: 'SELECT * FROM users',
  duration: 500,
  operation: 'SELECT',
  table: 'users',
  timestamp: Date.now(),
  issues: []
};
