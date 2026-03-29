/**
 * Tests for Root Cause Analyzer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RootCauseAnalyzer, rootCauseAnalyzer, type RootCauseAnalysis, type PerformanceProfile } from '../root-cause';

describe('RootCauseAnalyzer', () => {
  let analyzer: RootCauseAnalyzer;

  beforeEach(() => {
    analyzer = new RootCauseAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze performance profile and return results', () => {
      const profile: PerformanceProfile = {
        totalTransferSize: 500 * 1024,
        requestCount: 20,
        slowRequests: 0,
        averageResponseTime: 200,
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2000,
        firstInputDelay: 50,
        cumulativeLayoutShift: 0.05,
        timeToInteractive: 2500,
        scriptExecutionTime: 30,
        blockingScriptTime: 50,
        scriptErrors: 0,
        domNodes: 800,
        domDepth: 12,
        iframeCount: 0,
        memoryUsed: 50 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      };

      const result = analyzer.analyze(profile);

      expect(result).toBeDefined();
      expect(result.indicators).toBeInstanceOf(Array);
      expect(result.correlations).toBeInstanceOf(Array);
      expect(result.diagnosis).toBeDefined();
      expect(result.actionPlan).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
    });

    it('should detect memory leaks when memory is trending up', () => {
      // Simulate increasing memory
      for (let i = 0; i < 10; i++) {
        const profile: PerformanceProfile = {
          totalTransferSize: 500 * 1024,
          requestCount: 20,
          slowRequests: 0,
          averageResponseTime: 200,
          firstContentfulPaint: 1200,
          largestContentfulPaint: 2000,
          firstInputDelay: 50,
          cumulativeLayoutShift: 0.05,
          timeToInteractive: 2500,
          scriptExecutionTime: 30,
          blockingScriptTime: 50,
          scriptErrors: 0,
          domNodes: 800,
          domDepth: 12,
          iframeCount: 0,
          memoryUsed: 50 * 1024 * 1024 + (i * 1024 * 1024), // Increasing by 1MB each sample
          memoryLimit: 100 * 1024 * 1024,
        };
        analyzer.analyze(profile);
      }

      const profile: PerformanceProfile = {
        totalTransferSize: 500 * 1024,
        requestCount: 20,
        slowRequests: 0,
        averageResponseTime: 200,
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2000,
        firstInputDelay: 50,
        cumulativeLayoutShift: 0.05,
        timeToInteractive: 2500,
        scriptExecutionTime: 30,
        blockingScriptTime: 50,
        scriptErrors: 0,
        domNodes: 800,
        domDepth: 12,
        iframeCount: 0,
        memoryUsed: 60 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      };

      const result = analyzer.analyze(profile);

      const memoryIndicators = result.indicators.filter(
        i => i.type === 'memory-leak'
      );
      expect(memoryIndicators.length).toBeGreaterThan(0);
    });

    it('should detect slow queries', () => {
      const profile: PerformanceProfile = {
        totalTransferSize: 500 * 1024,
        requestCount: 20,
        slowRequests: 8, // Many slow requests
        averageResponseTime: 1200, // Slow response time
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2000,
        firstInputDelay: 50,
        cumulativeLayoutShift: 0.05,
        timeToInteractive: 2500,
        scriptExecutionTime: 30,
        blockingScriptTime: 50,
        scriptErrors: 0,
        domNodes: 800,
        domDepth: 12,
        iframeCount: 0,
        memoryUsed: 50 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      };

      const result = analyzer.analyze(profile);

      const slowQueryIndicators = result.indicators.filter(
        i => i.type === 'slow-query'
      );
      expect(slowQueryIndicators.length).toBeGreaterThan(0);
    });

    it('should detect cache issues', () => {
      const profile: PerformanceProfile = {
        totalTransferSize: 2 * 1024 * 1024, // Large transfer size
        requestCount: 80, // Many requests
        slowRequests: 5,
        averageResponseTime: 800, // High latency
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2000,
        firstInputDelay: 50,
        cumulativeLayoutShift: 0.05,
        timeToInteractive: 2500,
        scriptExecutionTime: 30,
        blockingScriptTime: 50,
        scriptErrors: 0,
        domNodes: 800,
        domDepth: 12,
        iframeCount: 0,
        memoryUsed: 50 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      };

      const result = analyzer.analyze(profile);

      const cacheIndicators = result.indicators.filter(
        i => i.type === 'cache-miss'
      );
      expect(cacheIndicators.length).toBeGreaterThan(0);
    });

    it('should calculate metric correlations', () => {
      const profile: PerformanceProfile = {
        totalTransferSize: 500 * 1024,
        requestCount: 20,
        slowRequests: 0,
        averageResponseTime: 200,
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2000,
        firstInputDelay: 50,
        cumulativeLayoutShift: 0.05,
        timeToInteractive: 2500,
        scriptExecutionTime: 30,
        blockingScriptTime: 50,
        scriptErrors: 0,
        domNodes: 800,
        domDepth: 12,
        iframeCount: 0,
        memoryUsed: 50 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      };

      const result = analyzer.analyze(profile);

      expect(result.correlations.length).toBeGreaterThan(0);
      result.correlations.forEach(correlation => {
        expect(correlation.metrics).toHaveLength(2);
        expect(correlation.correlationCoefficient).toBeGreaterThanOrEqual(-1);
        expect(correlation.correlationCoefficient).toBeLessThanOrEqual(1);
        expect(['positive', 'negative', 'none']).toContain(correlation.relationship);
        expect(['strong', 'moderate', 'weak']).toContain(correlation.significance);
      });
    });

    it('should generate action plan with prioritized items', () => {
      const profile: PerformanceProfile = {
        totalTransferSize: 2 * 1024 * 1024,
        requestCount: 80,
        slowRequests: 8,
        averageResponseTime: 1200,
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2000,
        firstInputDelay: 50,
        cumulativeLayoutShift: 0.05,
        timeToInteractive: 2500,
        scriptExecutionTime: 30,
        blockingScriptTime: 50,
        scriptErrors: 0,
        domNodes: 800,
        domDepth: 12,
        iframeCount: 0,
        memoryUsed: 50 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      };

      const result = analyzer.analyze(profile);

      expect(result.actionPlan.length).toBeGreaterThan(0);
      
      // Check that actions have required properties
      result.actionPlan.forEach(action => {
        expect(['p0', 'p1', 'p2', 'p3']).toContain(action.priority);
        expect(action.title).toBeDefined();
        expect(action.description).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(action.estimatedImpact);
        expect(['low', 'medium', 'high']).toContain(action.effort);
        expect(['immediate', 'short-term', 'long-term']).toContain(action.category);
      });

      // Check that actions are sorted by priority
      const priorityOrder = { p0: 0, p1: 1, p2: 2, p3: 3 };
      for (let i = 1; i < result.actionPlan.length; i++) {
        expect(priorityOrder[result.actionPlan[i].priority])
          .toBeGreaterThanOrEqual(priorityOrder[result.actionPlan[i - 1].priority]);
      }
    });

    it('should correctly determine overall health', () => {
      const criticalProfile: PerformanceProfile = {
        totalTransferSize: 3 * 1024 * 1024,
        requestCount: 120,
        slowRequests: 15,
        averageResponseTime: 3000,
        firstContentfulPaint: 4000,
        largestContentfulPaint: 5000,
        firstInputDelay: 400,
        cumulativeLayoutShift: 0.3,
        timeToInteractive: 8000,
        scriptExecutionTime: 100,
        blockingScriptTime: 200,
        scriptErrors: 5,
        domNodes: 2000,
        domDepth: 40,
        iframeCount: 5,
        memoryUsed: 95 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      };

      const criticalResult = analyzer.analyze(criticalProfile);
      expect(criticalResult.overallHealth).toBe('critical');

      const healthyProfile: PerformanceProfile = {
        totalTransferSize: 500 * 1024,
        requestCount: 20,
        slowRequests: 0,
        averageResponseTime: 200,
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2000,
        firstInputDelay: 50,
        cumulativeLayoutShift: 0.05,
        timeToInteractive: 2500,
        scriptExecutionTime: 30,
        blockingScriptTime: 50,
        scriptErrors: 0,
        domNodes: 800,
        domDepth: 12,
        iframeCount: 0,
        memoryUsed: 50 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      };

      const healthyResult = analyzer.analyze(healthyProfile);
      expect(healthyResult.overallHealth).toBe('healthy');
    });
  });

  describe('diagnosis', () => {
    it('should generate comprehensive diagnosis', () => {
      const profile: PerformanceProfile = {
        totalTransferSize: 2 * 1024 * 1024,
        requestCount: 80,
        slowRequests: 8,
        averageResponseTime: 1200,
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2000,
        firstInputDelay: 50,
        cumulativeLayoutShift: 0.05,
        timeToInteractive: 2500,
        scriptExecutionTime: 30,
        blockingScriptTime: 50,
        scriptErrors: 0,
        domNodes: 800,
        domDepth: 12,
        iframeCount: 0,
        memoryUsed: 50 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      };

      const result = analyzer.analyze(profile);

      expect(result.diagnosis.primaryIssue).toBeDefined();
      expect(result.diagnosis.rootCause).toBeDefined();
      expect(result.diagnosis.contributingFactors).toBeInstanceOf(Array);
      expect(result.diagnosis.affectedComponents).toBeInstanceOf(Array);
      expect(result.diagnosis.timeline).toBeInstanceOf(Array);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(rootCauseAnalyzer).toBeInstanceOf(RootCauseAnalyzer);
    });
  });
});
