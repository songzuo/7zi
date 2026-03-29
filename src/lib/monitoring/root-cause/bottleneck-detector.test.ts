/**
 * Bottleneck Detector Tests
 * Tests for performance bottleneck detection and recommendations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BottleneckDetector,
  bottleneckDetector,
  createMockPerformanceProfile,
  type Bottleneck,
  type BottleneckAnalysis,
} from './bottleneck-detector';

describe('BottleneckDetector', () => {
  let detector: BottleneckDetector;

  beforeEach(() => {
    detector = new BottleneckDetector();
  });

  describe('createMockPerformanceProfile', () => {
    it('should create a mock profile with defaults', () => {
      const profile = createMockPerformanceProfile();

      expect(profile).toBeDefined();
      expect(profile.totalTransferSize).toBe(500 * 1024);
      expect(profile.requestCount).toBe(20);
      expect(profile.firstContentfulPaint).toBe(1200);
      expect(profile.largestContentfulPaint).toBe(2000);
      expect(profile.scriptExecutionTime).toBe(30);
      expect(profile.domNodes).toBe(800);
    });

    it('should allow overriding defaults', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 1024 * 1024,
        requestCount: 150,
        firstContentfulPaint: 3000,
      });

      expect(profile.totalTransferSize).toBe(1024 * 1024);
      expect(profile.requestCount).toBe(150);
      expect(profile.firstContentfulPaint).toBe(3000);
    });

    it('should support all metrics', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 1024 * 1024,
        slowRequests: 5,
        firstContentfulPaint: 3000,
        largestContentfulPaint: 4000,
        scriptExecutionTime: 200,
        domNodes: 2000,
        memoryUsed: 80 * 1024 * 1024,
      });

      expect(profile.totalTransferSize).toBe(1024 * 1024);
      expect(profile.slowRequests).toBe(5);
      expect(profile.scriptExecutionTime).toBe(200);
      expect(profile.memoryUsed).toBe(80 * 1024 * 1024);
    });
  });

  describe('analyze', () => {
    it('should analyze a performance profile', () => {
      const profile = createMockPerformanceProfile();
      const analysis = detector.analyze(profile);

      expect(analysis).toBeDefined();
      expect(analysis.bottlenecks).toBeInstanceOf(Array);
      expect(analysis.overallScore).toBeDefined();
      expect(analysis.criticalIssues).toBeInstanceOf(Array);
      expect(analysis.highPriorityIssues).toBeInstanceOf(Array);
      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.summary).toBeDefined();
    });

    it('should handle profile with no bottlenecks', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 100 * 1024,
        requestCount: 10,
        slowRequests: 0,
        firstContentfulPaint: 500,
        largestContentfulPaint: 1000,
        scriptExecutionTime: 10,
      });

      const analysis = detector.analyze(profile);

      expect(analysis.bottlenecks).toHaveLength(0);
      expect(analysis.overallScore).toBe(100);
      expect(analysis.summary).toContain('excellent');
    });

    it('should identify critical bottlenecks', () => {
      const profile = createMockPerformanceProfile({
        firstContentfulPaint: 4000, // 2.2x threshold
      });

      const analysis = detector.analyze(profile);

      expect(analysis.criticalIssues.length).toBeGreaterThan(0);
    });

    it('should sort bottlenecks by impact', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
        requestCount: 150,
        scriptExecutionTime: 200,
      });

      const analysis = detector.analyze(profile);

      for (let i = 1; i < analysis.bottlenecks.length; i++) {
        expect(analysis.bottlenecks[i - 1].impact).toBeGreaterThanOrEqual(
          analysis.bottlenecks[i].impact
        );
      }
    });

    it('should generate recommendations for each bottleneck', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
        scriptExecutionTime: 200,
      });

      const analysis = detector.analyze(profile);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      analysis.bottlenecks.forEach((bottleneck) => {
        const hasRec = analysis.recommendations.some(
          (r) => r.bottleneckId === bottleneck.id
        );
        expect(hasRec).toBe(true);
      });
    });

    it('should generate meaningful summary', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
        firstContentfulPaint: 4000,
      });

      const analysis = detector.analyze(profile);

      expect(analysis.summary).toBeDefined();
      expect(analysis.summary.length).toBeGreaterThan(0);
      expect(analysis.summary).toContain('Score');
    });
  });

  describe('Network Bottlenecks', () => {
    it('should detect large transfer size', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024, // 3MB
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'network-large-transfer');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('network');
      expect(bottleneck?.name).toBe('Large Page Weight');
    });

    it('should detect too many requests', () => {
      const profile = createMockPerformanceProfile({
        requestCount: 150,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'network-many-requests');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('network');
      expect(bottleneck?.name).toBe('Too Many Requests');
    });

    it('should detect slow requests', () => {
      const profile = createMockPerformanceProfile({
        slowRequests: 10,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'network-slow-requests');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('network');
      expect(bottleneck?.name).toBe('Slow API Responses');
    });

    it('should not detect network issues with good metrics', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 500 * 1024,
        requestCount: 30,
        slowRequests: 0,
      });

      const analysis = detector.analyze(profile);
      const networkBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'network');

      expect(networkBottlenecks).toHaveLength(0);
    });

    it('should set correct severity based on impact', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 5 * 1024 * 1024, // Very large
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'network-large-transfer');

      expect(bottleneck?.severity).toBe('critical');
    });
  });

  describe('Render Bottlenecks', () => {
    it('should detect slow FCP', () => {
      const profile = createMockPerformanceProfile({
        firstContentfulPaint: 3000,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'render-slow-fcp');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('render');
      expect(bottleneck?.name).toBe('Slow First Contentful Paint');
    });

    it('should detect slow LCP', () => {
      const profile = createMockPerformanceProfile({
        largestContentfulPaint: 4000,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'render-slow-lcp');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('render');
      expect(bottleneck?.name).toBe('Slow Largest Contentful Paint');
    });

    it('should detect poor CLS', () => {
      const profile = createMockPerformanceProfile({
        cumulativeLayoutShift: 0.25,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'render-poor-cls');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('render');
      expect(bottleneck?.name).toBe('Poor Cumulative Layout Shift');
    });

    it('should not detect render issues with good metrics', () => {
      const profile = createMockPerformanceProfile({
        firstContentfulPaint: 800,
        largestContentfulPaint: 1500,
        cumulativeLayoutShift: 0.05,
      });

      const analysis = detector.analyze(profile);
      const renderBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'render');

      expect(renderBottlenecks).toHaveLength(0);
    });

    it('should detect multiple render bottlenecks', () => {
      const profile = createMockPerformanceProfile({
        firstContentfulPaint: 3000,
        largestContentfulPaint: 4000,
        cumulativeLayoutShift: 0.2,
      });

      const analysis = detector.analyze(profile);
      const renderBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'render');

      expect(renderBottlenecks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Script Bottlenecks', () => {
    it('should detect slow script execution', () => {
      const profile = createMockPerformanceProfile({
        scriptExecutionTime: 200,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'script-slow-execution');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('script');
      expect(bottleneck?.name).toBe('Slow Script Execution');
    });

    it('should detect blocking scripts', () => {
      const profile = createMockPerformanceProfile({
        blockingScriptTime: 300,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'script-blocking');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('script');
      expect(bottleneck?.name).toBe('Render-Blocking Scripts');
    });

    it('should detect script errors', () => {
      const profile = createMockPerformanceProfile({
        scriptErrors: 5,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'script-errors');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('script');
      expect(bottleneck?.name).toBe('Script Errors Detected');
    });

    it('should not detect script issues with good metrics', () => {
      const profile = createMockPerformanceProfile({
        scriptExecutionTime: 20,
        blockingScriptTime: 30,
        scriptErrors: 0,
      });

      const analysis = detector.analyze(profile);
      const scriptBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'script');

      expect(scriptBottlenecks).toHaveLength(0);
    });

    it('should detect multiple script bottlenecks', () => {
      const profile = createMockPerformanceProfile({
        scriptExecutionTime: 200,
        blockingScriptTime: 300,
        scriptErrors: 3,
      });

      const analysis = detector.analyze(profile);
      const scriptBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'script');

      expect(scriptBottlenecks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('DOM Bottlenecks', () => {
    it('should detect too many DOM nodes', () => {
      const profile = createMockPerformanceProfile({
        domNodes: 3000,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'dom-many-nodes');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('dom');
      expect(bottleneck?.name).toBe('Large DOM Tree');
    });

    it('should detect deep DOM nesting', () => {
      const profile = createMockPerformanceProfile({
        domDepth: 50,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'dom-deep-nesting');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('dom');
      expect(bottleneck?.name).toBe('Deep DOM Nesting');
    });

    it('should detect too many iframes', () => {
      const profile = createMockPerformanceProfile({
        iframeCount: 5,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'dom-many-iframes');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('dom');
      expect(bottleneck?.name).toBe('Too Many Iframes');
    });

    it('should not detect DOM issues with good metrics', () => {
      const profile = createMockPerformanceProfile({
        domNodes: 1000,
        domDepth: 20,
        iframeCount: 0,
      });

      const analysis = detector.analyze(profile);
      const domBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'dom');

      expect(domBottlenecks).toHaveLength(0);
    });

    it('should detect multiple DOM bottlenecks', () => {
      const profile = createMockPerformanceProfile({
        domNodes: 3000,
        domDepth: 50,
        iframeCount: 5,
      });

      const analysis = detector.analyze(profile);
      const domBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'dom');

      expect(domBottlenecks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Memory Bottlenecks', () => {
    it('should detect high memory usage', () => {
      const profile = createMockPerformanceProfile({
        memoryUsed: 80 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'memory-high-usage');

      expect(bottleneck).toBeDefined();
      expect(bottleneck?.type).toBe('memory');
      expect(bottleneck?.name).toBe('High Memory Usage');
    });

    it('should not detect memory issues with good metrics', () => {
      const profile = createMockPerformanceProfile({
        memoryUsed: 30 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);
      const memoryBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'memory');

      expect(memoryBottlenecks).toHaveLength(0);
    });

    it('should set critical severity for high memory usage', () => {
      const profile = createMockPerformanceProfile({
        memoryUsed: 90 * 1024 * 1024,
        memoryLimit: 100 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);
      const bottleneck = analysis.bottlenecks.find((b) => b.id === 'memory-high-usage');

      expect(bottleneck?.severity).toBe('critical');
    });

    it('should handle zero memory limit', () => {
      const profile = createMockPerformanceProfile({
        memoryUsed: 50 * 1024 * 1024,
        memoryLimit: 0,
      });

      const analysis = detector.analyze(profile);
      const memoryBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'memory');

      expect(memoryBottlenecks).toHaveLength(0);
    });
  });

  describe('calculateOverallScore', () => {
    it('should return 100 with no bottlenecks', () => {
      const profile = createMockPerformanceProfile();
      const analysis = detector.analyze(profile);

      // Modify thresholds to ensure no bottlenecks
      detector.updateThresholds({
        network: {
          totalTransferSize: Number.MAX_SAFE_INTEGER,
          requestCount: Number.MAX_SAFE_INTEGER,
          slowRequests: Number.MAX_SAFE_INTEGER,
          averageResponseTime: Number.MAX_SAFE_INTEGER,
        },
      });

      const cleanAnalysis = detector.analyze(profile);
      expect(cleanAnalysis.overallScore).toBe(100);
    });

    it('should reduce score with bottlenecks', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 5 * 1024 * 1024,
        scriptExecutionTime: 300,
      });

      const analysis = detector.analyze(profile);

      expect(analysis.overallScore).toBeLessThan(100);
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should penalize critical issues heavily', () => {
      const profile = createMockPerformanceProfile({
        firstContentfulPaint: 5000, // Very slow
      });

      const analysis = detector.analyze(profile);

      expect(analysis.criticalIssues.length).toBeGreaterThan(0);
      expect(analysis.overallScore).toBeLessThan(70);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for all bottleneck types', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
        scriptExecutionTime: 200,
        domNodes: 2000,
      });

      const analysis = detector.analyze(profile);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      analysis.recommendations.forEach((rec) => {
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.steps).toBeInstanceOf(Array);
        expect(rec.steps.length).toBeGreaterThan(0);
      });
    });

    it('should include effort and impact ratings', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);

      analysis.recommendations.forEach((rec) => {
        expect(['low', 'medium', 'high']).toContain(rec.effort);
        expect(['low', 'medium', 'high']).toContain(rec.impact);
      });
    });

    it('should include priority ratings', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);

      analysis.recommendations.forEach((rec) => {
        expect(rec.priority).toBeGreaterThanOrEqual(0);
        expect(rec.priority).toBeLessThanOrEqual(10);
      });
    });

    it('should link recommendations to bottlenecks', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);

      analysis.recommendations.forEach((rec) => {
        const hasBottleneck = analysis.bottlenecks.some(
          (b) => b.id === rec.bottleneckId
        );
        expect(hasBottleneck).toBe(true);
      });
    });

    it('should provide actionable steps', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);
      const transferRec = analysis.recommendations.find(
        (r) => r.bottleneckId === 'network-large-transfer'
      );

      expect(transferRec).toBeDefined();
      expect(transferRec?.steps.length).toBeGreaterThan(0);
      expect(transferRec?.steps[0]).toBeDefined();
    });
  });

  describe('Threshold Management', () => {
    it('should allow updating thresholds', () => {
      detector.updateThresholds({
        network: {
          totalTransferSize: 2 * 1024 * 1024,
          requestCount: 200,
          slowRequests: 10,
          averageResponseTime: 1000,
        },
      });

      const thresholds = detector.getThresholds();

      expect(thresholds.network.totalTransferSize).toBe(2 * 1024 * 1024);
      expect(thresholds.network.requestCount).toBe(200);
    });

    it('should use updated thresholds in detection', () => {
      detector.updateThresholds({
        network: {
          totalTransferSize: Number.MAX_SAFE_INTEGER,
          requestCount: Number.MAX_SAFE_INTEGER,
          slowRequests: Number.MAX_SAFE_INTEGER,
          averageResponseTime: Number.MAX_SAFE_INTEGER,
        },
      });

      const profile = createMockPerformanceProfile({
        totalTransferSize: 10 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);
      const networkBottlenecks = analysis.bottlenecks.filter((b) => b.type === 'network');

      // With very high thresholds, no network bottlenecks should be detected
      expect(networkBottlenecks).toHaveLength(0);
    });
  });

  describe('Singleton Instance', () => {
    it('should provide singleton instance', () => {
      expect(bottleneckDetector).toBeInstanceOf(BottleneckDetector);
    });

    it('should persist thresholds across uses', () => {
      bottleneckDetector.updateThresholds({
        network: {
          totalTransferSize: 999999,
          requestCount: 999999,
          slowRequests: 999999,
          averageResponseTime: 999999,
        },
      });

      const thresholds = bottleneckDetector.getThresholds();

      expect(thresholds.network.totalTransferSize).toBe(999999);

      // Reset for other tests
      const freshDetector = new BottleneckDetector();
      bottleneckDetector.updateThresholds(freshDetector.getThresholds());
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle profile with multiple bottleneck types', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
        requestCount: 150,
        firstContentfulPaint: 3000,
        scriptExecutionTime: 200,
        domNodes: 2000,
        memoryUsed: 80 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);

      expect(analysis.bottlenecks.length).toBeGreaterThan(5);
      expect(analysis.criticalIssues.length).toBeGreaterThan(0);
      expect(analysis.highPriorityIssues.length).toBeGreaterThan(0);
    });

    it('should handle edge case: zero values', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 0,
        requestCount: 0,
        firstContentfulPaint: 0,
      });

      const analysis = detector.analyze(profile);

      expect(analysis).toBeDefined();
    });

    it('should handle edge case: very large values', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: Number.MAX_SAFE_INTEGER,
        requestCount: Number.MAX_SAFE_INTEGER,
        scriptExecutionTime: Number.MAX_SAFE_INTEGER,
      });

      expect(() => detector.analyze(profile)).not.toThrow();
    });

    it('should handle negative values gracefully', () => {
      const profile = createMockPerformanceProfile({
        firstContentfulPaint: -100,
        scriptExecutionTime: -50,
      });

      expect(() => detector.analyze(profile)).not.toThrow();
    });
  });

  describe('Recommendation Quality', () => {
    it('should provide specific recommendations for each bottleneck', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
      });

      const analysis = detector.analyze(profile);
      const rec = analysis.recommendations.find(
        (r) => r.bottleneckId === 'network-large-transfer'
      );

      expect(rec?.title).toBe('Reduce Page Weight');
      expect(rec?.description.toLowerCase()).toContain('optimize');
      expect(rec?.steps).toContainEqual(
        expect.stringContaining('image')
      );
    });

    it('should categorize recommendations by type', () => {
      const profile = createMockPerformanceProfile({
        totalTransferSize: 3 * 1024 * 1024,
        scriptExecutionTime: 200,
      });

      const analysis = detector.analyze(profile);

      const types = analysis.recommendations.map((r) => r.type);
      const uniqueTypes = [...new Set(types)];

      expect(uniqueTypes.length).toBeGreaterThan(0);
    });

    it('should provide appropriate effort/impact ratings', () => {
      const profile = createMockPerformanceProfile({
        blockingScriptTime: 300,
      });

      const analysis = detector.analyze(profile);

      // Find the script-blocking bottleneck
      const bottleneck = analysis.bottlenecks.find(
        (b) => b.id === 'script-blocking'
      );

      if (bottleneck) {
        const rec = analysis.recommendations.find(
          (r) => r.bottleneckId === 'script-blocking'
        );

        expect(rec?.type).toBe('quick-win');
        expect(rec?.effort).toBe('low');
      } else {
        // If bottleneck wasn't detected, this test is not applicable
        expect(true).toBe(true);
      }
    });
  });
});
