/**
 * Predictive Prefetcher Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PredictivePrefetcher,
  UserContext,
  PrefetchPrediction,
} from '../predictive-prefetcher';

describe('PredictivePrefetcher', () => {
  let prefetcher: PredictivePrefetcher;

  beforeEach(() => {
    prefetcher = new PredictivePrefetcher({
      maxPrefetches: 5,
      confidenceThreshold: 0.2,
    });
  });

  describe('recordVisit', () => {
    it('should record a new visit', () => {
      prefetcher.recordVisit('/dashboard');
      
      const patterns = prefetcher.exportPatterns();
      const dashboardPattern = patterns.find(p => p.path === '/dashboard');
      
      expect(dashboardPattern).toBeDefined();
      expect(dashboardPattern?.visitCount).toBe(1);
    });

    it('should increment visit count for existing paths', () => {
      prefetcher.recordVisit('/tasks');
      prefetcher.recordVisit('/tasks');
      
      const patterns = prefetcher.exportPatterns();
      const tasksPattern = patterns.find(p => p.path === '/tasks');
      
      expect(tasksPattern?.visitCount).toBe(2);
    });

    it('should track time spent', () => {
      prefetcher.recordVisit('/dashboard', 5000);
      prefetcher.recordVisit('/dashboard', 10000);
      
      const patterns = prefetcher.exportPatterns();
      const dashboardPattern = patterns.find(p => p.path === '/dashboard');
      
      expect(dashboardPattern?.avgTimeSpent).toBe(7500);
    });
  });

  describe('recordNavigation', () => {
    it('should record navigation patterns', () => {
      // First record the source path so it exists
      prefetcher.recordVisit('/dashboard');
      
      // Then record navigation
      prefetcher.recordNavigation('/dashboard', '/tasks');
      prefetcher.recordNavigation('/dashboard', '/tasks');
      
      // Check that patterns were recorded
      const patterns = prefetcher.exportPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('predictNextPages', () => {
    const context: UserContext = {
      currentPath: '/dashboard',
      sessionDuration: 300000,
    };

    it('should return predictions for common paths', () => {
      const predictions = prefetcher.predictNextPages(context);
      
      // Should return predictions based on heuristics or history
      expect(Array.isArray(predictions)).toBe(true);
    });

    it('should predict based on context', () => {
      const taskContext: UserContext = {
        currentPath: '/tasks',
        taskContext: {
          type: 'task-editing',
          id: '123',
        },
        sessionDuration: 60000,
      };

      const predictions = prefetcher.predictNextPages(taskContext);
      
      const tasksPrediction = predictions.find(p => p.path === '/tasks');
      expect(tasksPrediction).toBeDefined();
      expect(tasksPrediction?.reason).toBe('contextual');
    });

    it('should apply heuristics for common paths', () => {
      const rootContext: UserContext = {
        currentPath: '/',
        sessionDuration: 10000,
      };

      const predictions = prefetcher.predictNextPages(rootContext);
      
      expect(predictions.some(p => p.path === '/dashboard')).toBe(true);
    });

    it('should respect maxPrefetches limit', () => {
      prefetcher = new PredictivePrefetcher({ maxPrefetches: 3, confidenceThreshold: 0.01 });
      
      const predictions = prefetcher.predictNextPages(context);
      
      expect(predictions.length).toBeLessThanOrEqual(3);
    });

    it('should filter low confidence predictions', () => {
      prefetcher = new PredictivePrefetcher({ confidenceThreshold: 0.8 });
      
      const predictions = prefetcher.predictNextPages(context);
      
      // All predictions should meet the threshold
      predictions.forEach(p => {
        expect(p.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('prefetch', () => {
    it('should cache prefetch results', async () => {
      const paths = ['/tasks', '/settings'];
      
      // First call
      await prefetcher.prefetch(paths);
      
      // Second call should use cache
      const cache = prefetcher.getCache();
      expect(cache.size).toBeGreaterThan(0);
    });

    it('should clear cache', () => {
      prefetcher.clearCache();
      
      const cache = prefetcher.getCache();
      expect(cache.size).toBe(0);
    });
  });

  describe('exportPatterns/importPatterns', () => {
    it('should export and import patterns', () => {
      prefetcher.recordVisit('/dashboard', 5000);
      prefetcher.recordNavigation('/dashboard', '/tasks');
      
      const patterns = prefetcher.exportPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      
      const newPrefetcher = new PredictivePrefetcher();
      newPrefetcher.importPatterns(patterns);
      
      const importedPatterns = newPrefetcher.exportPatterns();
      expect(importedPatterns.find(p => p.path === '/dashboard')).toBeDefined();
    });
  });
});
