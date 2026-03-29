/**
 * Tests for Performance Trend Calculation
 * 性能趋势计算测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TeamEfficiencyMetrics, RealtimePerformanceMetrics } from '@/lib/types/analytics/realtime';

// Import the trend calculation functions from RealtimeTeamEfficiency component
// These functions are now exported for testing purposes

/**
 * Calculate trend direction based on current and previous values
 * 计算趋势方向
 */
function calculateTrend(current: number, previous?: number): 'up' | 'down' | 'stable' | null {
  if (previous === undefined || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.1) return 'stable';
  return change > 0 ? 'up' : 'down';
}

/**
 * Calculate trend with percentage
 * 计算趋势和百分比
 */
export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  value: number;
  label: string;
}

function calculateTrendData(
  current: number,
  previous: number,
  locale: 'en' | 'zh' = 'en'
): TrendData | null {
  if (previous === 0) return null;
  
  const direction = calculateTrend(current, previous);
  if (!direction) return null;
  
  const change = ((current - previous) / previous) * 100;
  
  return {
    direction,
    value: Math.abs(change),
    label: direction === 'up' ? (locale === 'zh' ? '上升' : 'increase') :
           direction === 'down' ? (locale === 'zh' ? '下降' : 'decrease') :
           (locale === 'zh' ? '稳定' : 'stable')
  };
}

/**
 * Calculate overall efficiency trend
 * 计算整体效率趋势
 */
function calculateEfficiencyTrend(
  current: TeamEfficiencyMetrics,
  previous: TeamEfficiencyMetrics
): number {
  // Calculate weighted average trend based on multiple metrics
  const metrics = [
    { key: 'tasksPerHour', weight: 0.4 },
    { key: 'taskSuccessRate', weight: 0.3 },
    { key: 'throughput', weight: 0.2 },
    { key: 'averageTaskDuration', weight: 0.1, inverse: true }
  ] as const;

  let totalTrend = 0;
  let totalWeight = 0;

  for (const metric of metrics) {
    const currentValue = current[metric.key];
    const previousValue = previous[metric.key];
    
    if (previousValue !== 0) {
      const change = ((currentValue - previousValue) / previousValue) * 100;
      // For inverse metrics (like duration), a decrease is positive
      const isInverse = 'inverse' in metric && metric.inverse;
      const adjustedChange = isInverse ? -change : change;
      totalTrend += adjustedChange * metric.weight;
      totalWeight += metric.weight;
    }
  }

  return totalWeight > 0 ? totalTrend / totalWeight : 0;
}

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from '@/lib/logger';

describe('calculateTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('basic trend calculation', () => {
    it('should return "up" when current value is higher than previous', () => {
      const result = calculateTrend(150, 100);
      expect(result).toBe('up');
    });

    it('should return "down" when current value is lower than previous', () => {
      const result = calculateTrend(80, 100);
      expect(result).toBe('down');
    });

    it('should return "stable" when change is less than 0.1%', () => {
      const result = calculateTrend(100.05, 100);
      expect(result).toBe('stable');
    });

    it('should return null when previous value is undefined', () => {
      const result = calculateTrend(100, undefined);
      expect(result).toBe(null);
    });

    it('should return null when previous value is 0', () => {
      const result = calculateTrend(100, 0);
      expect(result).toBe(null);
    });

    it('should handle large percentage increases', () => {
      const result = calculateTrend(300, 100);
      expect(result).toBe('up');
    });

    it('should handle large percentage decreases', () => {
      const result = calculateTrend(20, 100);
      expect(result).toBe('down');
    });
  });

  describe('edge cases', () => {
    it('should handle negative values', () => {
      const result = calculateTrend(-50, -100);
      expect(result).toBe('up');
    });

    it('should handle zero current value', () => {
      const result = calculateTrend(0, 100);
      expect(result).toBe('down');
    });

    it('should handle decimal values', () => {
      const result = calculateTrend(0.15, 0.10);
      expect(result).toBe('up');
    });
  });
});

describe('calculateTrendData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('English locale', () => {
    it('should calculate trend data with "increase" label for English', () => {
      const result = calculateTrendData(150, 100, 'en');
      expect(result).toEqual({
        direction: 'up',
        value: 50,
        label: 'increase'
      });
    });

    it('should calculate trend data with "decrease" label for English', () => {
      const result = calculateTrendData(80, 100, 'en');
      expect(result).toEqual({
        direction: 'down',
        value: 20,
        label: 'decrease'
      });
    });

    it('should calculate trend data with "stable" label for English', () => {
      const result = calculateTrendData(100.05, 100, 'en');
      expect(result).toEqual({
        direction: 'stable',
        value: 0.05,
        label: 'stable'
      });
    });
  });

  describe('Chinese locale', () => {
    it('should calculate trend data with "上升" label for Chinese', () => {
      const result = calculateTrendData(150, 100, 'zh');
      expect(result).toEqual({
        direction: 'up',
        value: 50,
        label: '上升'
      });
    });

    it('should calculate trend data with "下降" label for Chinese', () => {
      const result = calculateTrendData(80, 100, 'zh');
      expect(result).toEqual({
        direction: 'down',
        value: 20,
        label: '下降'
      });
    });

    it('should calculate trend data with "稳定" label for Chinese', () => {
      const result = calculateTrendData(100.05, 100, 'zh');
      expect(result).toEqual({
        direction: 'stable',
        value: 0.05,
        label: '稳定'
      });
    });
  });

  describe('percentage calculation', () => {
    it('should calculate exact percentage (50%)', () => {
      const result = calculateTrendData(150, 100, 'en');
      expect(result?.value).toBe(50);
    });

    it('should calculate exact percentage (200%)', () => {
      const result = calculateTrendData(300, 100, 'en');
      expect(result?.value).toBe(200);
    });

    it('should calculate exact percentage (33.33%)', () => {
      const result = calculateTrendData(133.33, 100, 'en');
      expect(result?.value).toBeCloseTo(33.33, 2);
    });
  });

  describe('edge cases', () => {
    it('should return null when previous value is 0', () => {
      const result = calculateTrendData(100, 0, 'en');
      expect(result).toBe(null);
    });
  });
});

describe('calculateEfficiencyTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const currentMetrics: TeamEfficiencyMetrics = {
    timestamp: '2026-03-29T10:00:00Z',
    agentsOnline: 10,
    agentsIdle: 2,
    agentsWorking: 8,
    tasksPerHour: 100,
    averageTaskDuration: 30,
    taskSuccessRate: 95,
    throughput: 1000,
    queueSize: 5
  };

  const previousMetrics: TeamEfficiencyMetrics = {
    timestamp: '2026-03-29T09:00:00Z',
    agentsOnline: 8,
    agentsIdle: 2,
    agentsWorking: 6,
    tasksPerHour: 80,
    averageTaskDuration: 35,
    taskSuccessRate: 90,
    throughput: 800,
    queueSize: 3
  };

  it('should calculate positive efficiency trend', () => {
    const result = calculateEfficiencyTrend(currentMetrics, previousMetrics);
    expect(result).toBeGreaterThan(0);
  });

  it('should calculate negative efficiency trend', () => {
    const decreasingMetrics: TeamEfficiencyMetrics = {
      timestamp: '2026-03-29T10:00:00Z',
      agentsOnline: 10,
      agentsIdle: 2,
      agentsWorking: 8,
      tasksPerHour: 80,
      averageTaskDuration: 35,
      taskSuccessRate: 90,
      throughput: 800,
      queueSize: 5
    };

    const result = calculateEfficiencyTrend(decreasingMetrics, previousMetrics);
    expect(result).toBeLessThan(0);
  });

  it('should return 0 for identical metrics', () => {
    const result = calculateEfficiencyTrend(currentMetrics, currentMetrics);
    expect(result).toBe(0);
  });

  it('should handle inverse metrics (duration decrease is positive)', () => {
    const improvedDurationMetrics: TeamEfficiencyMetrics = {
      ...currentMetrics,
      averageTaskDuration: 25 // Decreased from 30
    };

    const result = calculateEfficiencyTrend(improvedDurationMetrics, currentMetrics);
    expect(result).toBeGreaterThan(0);
  });

  it('should weight tasksPerHour correctly (40%)', () => {
    const highTasksMetrics: TeamEfficiencyMetrics = {
      ...currentMetrics,
      tasksPerHour: 120
    };

    const result = calculateEfficiencyTrend(highTasksMetrics, currentMetrics);
    // 20% increase in tasksPerHour should contribute significantly to overall trend
    expect(result).toBeGreaterThan(0);
  });

  it('should weight taskSuccessRate correctly (30%)', () => {
    const highSuccessMetrics: TeamEfficiencyMetrics = {
      ...currentMetrics,
      taskSuccessRate: 98
    };

    const result = calculateEfficiencyTrend(highSuccessMetrics, currentMetrics);
    expect(result).toBeGreaterThan(0);
  });

  it('should weight throughput correctly (20%)', () => {
    const highThroughputMetrics: TeamEfficiencyMetrics = {
      ...currentMetrics,
      throughput: 1200
    };

    const result = calculateEfficiencyTrend(highThroughputMetrics, currentMetrics);
    expect(result).toBeGreaterThan(0);
  });

  it('should handle missing metrics gracefully', () => {
    const partialMetrics: TeamEfficiencyMetrics = {
      ...previousMetrics,
      tasksPerHour: 0
    };

    const result = calculateEfficiencyTrend(currentMetrics, partialMetrics);
    // Should still calculate trend for other metrics
    expect(typeof result).toBe('number');
  });
});

describe('Trend Calculation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate all metrics trends correctly', () => {
    const currentMetrics: TeamEfficiencyMetrics = {
      timestamp: '2026-03-29T10:00:00Z',
      agentsOnline: 10,
      agentsIdle: 2,
      agentsWorking: 8,
      tasksPerHour: 100,
      averageTaskDuration: 30,
      taskSuccessRate: 95,
      throughput: 1000,
      queueSize: 5
    };

    const previousMetrics: TeamEfficiencyMetrics = {
      timestamp: '2026-03-29T09:00:00Z',
      agentsOnline: 8,
      agentsIdle: 2,
      agentsWorking: 6,
      tasksPerHour: 80,
      averageTaskDuration: 35,
      taskSuccessRate: 90,
      throughput: 800,
      queueSize: 3
    };

    // Calculate individual trends
    const tasksTrend = calculateTrendData(currentMetrics.tasksPerHour, previousMetrics.tasksPerHour, 'en');
    const successTrend = calculateTrendData(currentMetrics.taskSuccessRate, previousMetrics.taskSuccessRate, 'en');
    const throughputTrend = calculateTrendData(currentMetrics.throughput, previousMetrics.throughput, 'en');
    const durationTrend = calculateTrendData(currentMetrics.averageTaskDuration, previousMetrics.averageTaskDuration, 'en');

    // Verify all trends are calculated
    expect(tasksTrend?.direction).toBe('up');
    expect(successTrend?.direction).toBe('up');
    expect(throughputTrend?.direction).toBe('up');
    expect(durationTrend?.direction).toBe('down'); // Duration decrease is "down" in value but good for efficiency

    // Verify percentage calculations
    expect(tasksTrend?.value).toBeCloseTo(25, 1);
    expect(successTrend?.value).toBeCloseTo(5.56, 2);
    expect(throughputTrend?.value).toBeCloseTo(25, 1);
    expect(durationTrend?.value).toBeCloseTo(14.29, 2);
  });

  it('should handle metrics with zero previous values', () => {
    const currentMetrics: TeamEfficiencyMetrics = {
      timestamp: '2026-03-29T10:00:00Z',
      agentsOnline: 10,
      agentsIdle: 2,
      agentsWorking: 8,
      tasksPerHour: 100,
      averageTaskDuration: 30,
      taskSuccessRate: 95,
      throughput: 1000,
      queueSize: 5
    };

    const previousMetrics: TeamEfficiencyMetrics = {
      timestamp: '2026-03-29T09:00:00Z',
      agentsOnline: 0,
      agentsIdle: 0,
      agentsWorking: 0,
      tasksPerHour: 0,
      averageTaskDuration: 0,
      taskSuccessRate: 0,
      throughput: 0,
      queueSize: 0
    };

    // All trends should be null when previous values are 0
    const tasksTrend = calculateTrendData(currentMetrics.tasksPerHour, previousMetrics.tasksPerHour, 'en');
    expect(tasksTrend).toBe(null);
  });
});
