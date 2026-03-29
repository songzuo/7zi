/**
 * Performance Root Cause Analyzer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PerformanceRootCauseAnalyzer,
  createMockCoreWebVitals,
  createMockMemoryMetrics,
  createMockNetworkTiming,
  CORE_WEB_VITALS_THRESHOLDS,
  type CoreWebVitalsMetrics,
  type MemoryMetrics,
  type NetworkTimingBreakdown,
} from './performance-root-cause';

describe('PerformanceRootCauseAnalyzer', () => {
  let analyzer: PerformanceRootCauseAnalyzer;

  beforeEach(() => {
    analyzer = new PerformanceRootCauseAnalyzer();
  });

  describe('diagnoseSlowPages', () => {
    it('should return empty array for healthy metrics', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 1200,
        LCP: 2000,
        CLS: 0.05,
        INP: 100,
      });

      const diagnoses = analyzer.diagnoseSlowPages(metrics);
      expect(diagnoses).toHaveLength(0);
    });

    it('should diagnose slow FCP', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 3500, // Poor
        LCP: 2000,
        CLS: 0.05,
        INP: 100,
      });

      const diagnoses = analyzer.diagnoseSlowPages(metrics);
      expect(diagnoses).toHaveLength(1);
      expect(diagnoses[0].metric).toBe('FCP');
      expect(diagnoses[0].severity).toBe('poor');
      expect(diagnoses[0].rootCauses.length).toBeGreaterThan(0);
      expect(diagnoses[0].recommendations.length).toBeGreaterThan(0);
    });

    it('should diagnose slow LCP', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 1200,
        LCP: 4500, // Poor
        CLS: 0.05,
        INP: 100,
      });

      const diagnoses = analyzer.diagnoseSlowPages(metrics);
      expect(diagnoses).toHaveLength(1);
      expect(diagnoses[0].metric).toBe('LCP');
      expect(diagnoses[0].severity).toBe('poor');
    });

    it('should diagnose poor CLS', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 1200,
        LCP: 2000,
        CLS: 0.3, // Poor
        INP: 100,
      });

      const diagnoses = analyzer.diagnoseSlowPages(metrics);
      expect(diagnoses).toHaveLength(1);
      expect(diagnoses[0].metric).toBe('CLS');
      expect(diagnoses[0].severity).toBe('poor');
    });

    it('should diagnose slow INP', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 1200,
        LCP: 2000,
        CLS: 0.05,
        INP: 600, // Poor
      });

      const diagnoses = analyzer.diagnoseSlowPages(metrics);
      expect(diagnoses).toHaveLength(1);
      expect(diagnoses[0].metric).toBe('INP');
      expect(diagnoses[0].severity).toBe('poor');
    });

    it('should detect needs-improvement severity', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 2200, // Needs improvement
        LCP: 3000, // Needs improvement
        CLS: 0.05,
        INP: 100,
      });

      const diagnoses = analyzer.diagnoseSlowPages(metrics);
      expect(diagnoses.length).toBeGreaterThan(0);
      expect(diagnoses.some((d) => d.severity === 'needs-improvement')).toBe(true);
    });

    it('should calculate deviation correctly', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 3600, // Double the threshold
        LCP: 2000,
        CLS: 0.05,
        INP: 100,
      });

      const diagnoses = analyzer.diagnoseSlowPages(metrics);
      const fcpDiagnosis = diagnoses.find((d) => d.metric === 'FCP');
      expect(fcpDiagnosis).toBeDefined();
      expect(fcpDiagnosis?.deviation).toBeCloseTo(100, 0); // ~100% over threshold
    });
  });

  describe('detectMemoryLeak', () => {
    it('should return no leak for stable memory', () => {
      const memoryMetrics = createMockMemoryMetrics({
        growthRate: 0,
        trend: 'stable',
      });

      const result = analyzer.detectMemoryLeak(memoryMetrics);
      expect(result.detected).toBe(false);
      expect(result.severity).toBe('none');
    });

    it('should detect critical memory leak', () => {
      const memoryMetrics = createMockMemoryMetrics({
        usedJSHeapSize: 150 * 1024 * 1024, // 150MB
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
        growthRate: 60 * 1024 * 1024, // 60MB/sec
        trend: 'increasing',
      });

      const result = analyzer.detectMemoryLeak(memoryMetrics);
      expect(result.detected).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.suspectedSources.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect high severity memory leak', () => {
      const memoryMetrics = createMockMemoryMetrics({
        growthRate: 20 * 1024 * 1024, // 20MB/sec
        trend: 'increasing',
      });

      const result = analyzer.detectMemoryLeak(memoryMetrics);
      expect(result.detected).toBe(true);
      expect(result.severity).toBe('high');
    });

    it('should estimate time to OOM', () => {
      const memoryMetrics = createMockMemoryMetrics({
        usedJSHeapSize: 100 * 1024 * 1024, // 100MB
        totalJSHeapSize: 150 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
        growthRate: 10 * 1024 * 1024, // 10MB/sec
        trend: 'increasing',
      });

      const result = analyzer.detectMemoryLeak(memoryMetrics);
      expect(result.estimatedTimeToOOM).toBeGreaterThan(0);
      expect(result.estimatedTimeToOOM).toBeCloseTo(10, 0); // ~10 seconds
    });

    it('should collect memory samples over time', () => {
      const metrics1 = createMockMemoryMetrics({
        usedJSHeapSize: 50 * 1024 * 1024,
      });

      const result1 = analyzer.detectMemoryLeak(metrics1);
      expect(result1.memoryTrend.length).toBe(1);

      const metrics2 = createMockMemoryMetrics({
        usedJSHeapSize: 55 * 1024 * 1024,
      });

      const result2 = analyzer.detectMemoryLeak(metrics2);
      expect(result2.memoryTrend.length).toBe(2);
    });
  });

  describe('identifyNetworkBottlenecks', () => {
    it('should return no bottlenecks for fast connection', () => {
      const timings = [
        createMockNetworkTiming({
          dns: 20,
          tcp: 15,
          tls: 10,
          request: 50,
          response: 100,
        }),
      ];

      const bottlenecks = analyzer.identifyNetworkBottlenecks(timings);
      expect(bottlenecks).toHaveLength(0);
    });

    it('should detect DNS bottleneck', () => {
      const timings = [
        createMockNetworkTiming({
          dns: 200, // Slow DNS
          tcp: 15,
          tls: 10,
          request: 50,
          response: 100,
        }),
      ];

      const bottlenecks = analyzer.identifyNetworkBottlenecks(timings);
      const dnsBottleneck = bottlenecks.find((b) => b.type === 'dns');
      expect(dnsBottleneck).toBeDefined();
      expect(dnsBottleneck?.severity).toBe('high');
      expect(dnsBottleneck?.recommendation).toContain('dns-prefetch');
    });

    it('should detect TCP bottleneck', () => {
      const timings = [
        createMockNetworkTiming({
          dns: 20,
          tcp: 250, // Slow TCP
          tls: 10,
          request: 50,
          response: 100,
        }),
      ];

      const bottlenecks = analyzer.identifyNetworkBottlenecks(timings);
      const tcpBottleneck = bottlenecks.find((b) => b.type === 'tcp');
      expect(tcpBottleneck).toBeDefined();
      expect(tcpBottleneck?.severity).toBe('high');
    });

    it('should detect TLS bottleneck', () => {
      const timings = [
        createMockNetworkTiming({
          dns: 20,
          tcp: 15,
          tls: 300, // Slow TLS
          request: 50,
          response: 100,
        }),
      ];

      const bottlenecks = analyzer.identifyNetworkBottlenecks(timings);
      const tlsBottleneck = bottlenecks.find((b) => b.type === 'tls');
      expect(tlsBottleneck).toBeDefined();
      expect(tlsBottleneck?.severity).toBe('high');
    });

    it('should detect response bottleneck', () => {
      const timings = [
        createMockNetworkTiming({
          dns: 20,
          tcp: 15,
          tls: 10,
          request: 50,
          response: 1000, // Slow response
        }),
      ];

      const bottlenecks = analyzer.identifyNetworkBottlenecks(timings);
      const responseBottleneck = bottlenecks.find((b) => b.type === 'response');
      expect(responseBottleneck).toBeDefined();
      expect(responseBottleneck?.severity).toBe('high');
    });

    it('should detect multiple bottlenecks', () => {
      const timings = [
        createMockNetworkTiming({
          dns: 200,
          tcp: 250,
          tls: 300,
          request: 500,
          response: 1000,
        }),
      ];

      const bottlenecks = analyzer.identifyNetworkBottlenecks(timings);
      expect(bottlenecks.length).toBeGreaterThan(1);
    });

    it('should calculate correct severity levels', () => {
      const timings = [
        createMockNetworkTiming({
          dns: 400, // 4x threshold - critical
        }),
      ];

      const bottlenecks = analyzer.identifyNetworkBottlenecks(timings);
      const dnsBottleneck = bottlenecks.find((b) => b.type === 'dns');
      expect(dnsBottleneck?.severity).toBe('critical');
    });
  });

  describe('diagnoseRenderIssues', () => {
    it('should handle empty performance entries', () => {
      const entries: PerformanceEntry[] = [];
      const issues = analyzer.diagnoseRenderIssues(entries);
      expect(issues).toHaveLength(0);
    });

    it('should identify long tasks', () => {
      const entries: PerformanceEntry[] = [
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 0,
          duration: 100, // Long task
        } as PerformanceEntry,
      ];

      const issues = analyzer.diagnoseRenderIssues(entries);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('long-task');
      expect(issues[0].duration).toBe(100);
      expect(issues[0].impact).toBe('high');
    });

    it('should identify critical long tasks', () => {
      const entries: PerformanceEntry[] = [
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 0,
          duration: 250, // Very long task
        } as PerformanceEntry,
      ];

      const issues = analyzer.diagnoseRenderIssues(entries);
      expect(issues[0].impact).toBe('critical');
    });

    it('should filter out short tasks', () => {
      const entries: PerformanceEntry[] = [
        {
          entryType: 'longtask',
          name: 'self',
          startTime: 0,
          duration: 30, // Not long enough
        } as PerformanceEntry,
      ];

      const issues = analyzer.diagnoseRenderIssues(entries);
      expect(issues).toHaveLength(0);
    });
  });

  describe('analyze', () => {
    it('should perform complete root cause analysis', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 1200,
        LCP: 2000,
        CLS: 0.05,
        INP: 100,
      });

      const memoryMetrics = createMockMemoryMetrics();
      const networkTimings = [createMockNetworkTiming()];
      const url = 'https://example.com';

      const analysis = analyzer.analyze(metrics, memoryMetrics, networkTimings, url);

      expect(analysis).toBeDefined();
      expect(analysis.timestamp).toBeInstanceOf(Date);
      expect(analysis.url).toBe(url);
      expect(analysis.coreWebVitals).toEqual(metrics);
      expect(analysis.slowPageDiagnoses).toBeInstanceOf(Array);
      expect(analysis.memoryAnalysis).toBeDefined();
      expect(analysis.networkBottlenecks).toBeInstanceOf(Array);
      expect(analysis.renderIssues).toBeInstanceOf(Array);
      expect(analysis.overallHealth).toBe('healthy' | 'degraded' | 'critical');
      expect(analysis.priorityActions).toBeInstanceOf(Array);
      expect(analysis.summary).toBeTruthy();
    });

    it('should determine healthy status for good metrics', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 1200,
        LCP: 2000,
        CLS: 0.05,
        INP: 100,
      });

      const memoryMetrics = createMockMemoryMetrics();
      const networkTimings = [createMockNetworkTiming()];

      const analysis = analyzer.analyze(metrics, memoryMetrics, networkTimings, 'test');

      expect(analysis.overallHealth).toBe('healthy');
    });

    it('should determine critical status for poor metrics', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 3500,
        LCP: 4500,
        CLS: 0.3,
        INP: 600,
      });

      const memoryMetrics = createMockMemoryMetrics({
        growthRate: 60 * 1024 * 1024,
        trend: 'increasing',
      });

      const networkTimings = [
        createMockNetworkTiming({
          dns: 400,
          tcp: 400,
          tls: 400,
          request: 400,
          response: 1000,
        }),
      ];

      const analysis = analyzer.analyze(metrics, memoryMetrics, networkTimings, 'test');

      expect(analysis.overallHealth).toBe('critical');
      expect(analysis.slowPageDiagnoses.length).toBeGreaterThan(0);
      expect(analysis.memoryAnalysis.detected).toBe(true);
      expect(analysis.networkBottlenecks.length).toBeGreaterThan(0);
    });

    it('should generate priority actions', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 3500,
        LCP: 2000,
        CLS: 0.05,
        INP: 100,
      });

      const memoryMetrics = createMockMemoryMetrics();
      const networkTimings = [createMockNetworkTiming()];

      const analysis = analyzer.analyze(metrics, memoryMetrics, networkTimings, 'test');

      expect(analysis.priorityActions.length).toBeGreaterThan(0);
      const firstAction = analysis.priorityActions[0];
      expect(firstAction.rank).toBe(1);
      expect(firstAction.category).toBe('immediate' | 'short-term' | 'long-term');
      expect(firstAction.impact).toBe('high' | 'medium' | 'low');
      expect(firstAction.effort).toBe('low' | 'medium' | 'high');
      expect(firstAction.action).toBeTruthy();
      expect(firstAction.estimatedGain).toBeTruthy();
    });
  });

  describe('startObserving and stopObserving', () => {
    it('should not throw when PerformanceObserver is unavailable', () => {
      expect(() => analyzer.startObserving()).not.toThrow();
      expect(() => analyzer.stopObserving()).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all collected data', () => {
      const metrics = createMockCoreWebVitals();
      const memoryMetrics = createMockMemoryMetrics();
      const networkTimings = [createMockNetworkTiming()];

      analyzer.analyze(metrics, memoryMetrics, networkTimings, 'test');
      analyzer.collectMemorySample();

      analyzer.clear();

      // Analyze again - should start fresh
      const analysis2 = analyzer.analyze(metrics, memoryMetrics, networkTimings, 'test');
      expect(analysis2.memoryAnalysis.memoryTrend.length).toBeLessThan(2);
    });
  });

  describe('mock utilities', () => {
    it('should create mock Core Web Vitals metrics', () => {
      const metrics = createMockCoreWebVitals({
        FCP: 1500,
        LCP: 2500,
      });

      expect(metrics).toBeDefined();
      expect(metrics.FCP).toBe(1500);
      expect(metrics.LCP).toBe(2500);
      expect(metrics.CLS).toBe(0.05); // Default
      expect(metrics.INP).toBe(100); // Default
    });

    it('should create mock memory metrics', () => {
      const metrics = createMockMemoryMetrics({
        usedJSHeapSize: 100 * 1024 * 1024,
      });

      expect(metrics).toBeDefined();
      expect(metrics.usedJSHeapSize).toBe(100 * 1024 * 1024);
      expect(metrics.totalJSHeapSize).toBeDefined();
      expect(metrics.jsHeapSizeLimit).toBeDefined();
      expect(metrics.samples).toBeDefined();
      expect(metrics.samples.length).toBeGreaterThan(0);
    });

    it('should create mock network timing', () => {
      const timing = createMockNetworkTiming({
        dns: 50,
        tcp: 40,
      });

      expect(timing).toBeDefined();
      expect(timing.dns).toBe(50);
      expect(timing.tcp).toBe(40);
      expect(timing.total).toBeDefined();
    });
  });
});
