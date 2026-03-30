/**
 * Mock for api-tracker
 */

import { vi } from 'vitest';

export class APITracker {
  trackRequest = vi.fn().mockReturnValue('request-id-123');
  getHistory = vi.fn().mockReturnValue([]);
  analyze = vi.fn().mockReturnValue({
    requestStatistics: {
      totalRequests: 0,
      averageDuration: 0,
      slowRequests: 0,
      errorRate: 0,
      topSlowEndpoints: []
    },
    criticalIssues: []
  });
  clearHistory = vi.fn();
  updateConfig = vi.fn();
}

export const APIRequestMock = {
  id: 'request-1',
  endpoint: '/api/users',
  method: 'GET',
  duration: 300,
  statusCode: 200,
  timestamp: Date.now(),
  issues: []
};
