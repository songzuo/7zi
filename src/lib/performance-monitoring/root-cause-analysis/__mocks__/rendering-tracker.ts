/**
 * Mock for rendering-tracker
 */

import { vi } from 'vitest';

export class RenderingTracker {
  trackMetrics = vi.fn();
  getMetrics = vi.fn().mockReturnValue([]);
  getLongTasks = vi.fn().mockReturnValue([]);
  analyze = vi.fn().mockReturnValue({
    metrics: [],
    longTaskDuration: 0,
    totalBlockingTime: 0,
    criticalIssues: []
  });
  clearHistory = vi.fn();
  updateConfig = vi.fn();
}

export const RenderingMetricsMock = {
  lcp: 2500,
  cls: 0.1,
  fid: 100,
  tbt: 150,
  longTaskDuration: 150,
  timestamp: Date.now()
};
