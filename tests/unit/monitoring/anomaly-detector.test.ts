/**
 * Anomaly Detector Unit Tests
 * Tests for statistical anomaly detection based on Z-Score
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AnomalyDetector,
  calculateMean,
  calculateStdDev,
  calculateZScore,
  detectAnomalyZScore,
  anomalyDetector,
} from '@/lib/monitoring/anomaly-detector';

describe('calculateMean', () => {
  it('should calculate mean of empty array', () => {
    expect(calculateMean([])).toBe(0);
  });

  it('should calculate mean of single value', () => {
    expect(calculateMean([100])).toBe(100);
  });

  it('should calculate mean of multiple values', () => {
    expect(calculateMean([100, 200, 300])).toBe(200);
  });

  it('should handle negative values', () => {
    expect(calculateMean([-10, 0, 10])).toBe(0);
  });

  it('should handle decimal values', () => {
    expect(calculateMean([1.5, 2.5, 3.5])).toBeCloseTo(2.5);
  });
});

describe('calculateStdDev', () => {
  it('should return 0 for empty array', () => {
    expect(calculateStdDev([])).toBe(0);
  });

  it('should return 0 for single value', () => {
    expect(calculateStdDev([100])).toBe(0);
  });

  it('should calculate standard deviation', () => {
    expect(calculateStdDev([100, 100, 100])).toBe(0);
    expect(calculateStdDev([90, 100, 110])).toBeCloseTo(8.16, 1);
  });

  it('should use provided mean', () => {
    const values = [90, 100, 110];
    const mean = 100;
    expect(calculateStdDev(values, mean)).toBeCloseTo(8.16, 1);
  });

  it('should handle larger datasets', () => {
    const values = Array.from({ length: 100 }, (_, i) => i);
    const stdDev = calculateStdDev(values);
    expect(stdDev).toBeGreaterThan(28);
    expect(stdDev).toBeLessThan(30);
  });
});

describe('calculateZScore', () => {
  it('should calculate Z-score', () => {
    expect(calculateZScore(130, 100, 10)).toBe(3);
    expect(calculateZScore(70, 100, 10)).toBe(-3);
  });

  it('should return 0 when stdDev is 0', () => {
    expect(calculateZScore(100, 100, 0)).toBe(0);
  });

  it('should handle mean equals value', () => {
    expect(calculateZScore(100, 100, 10)).toBe(0);
  });

  it('should handle negative Z-scores', () => {
    expect(calculateZScore(90, 100, 10)).toBe(-1);
  });
});

describe('detectAnomalyZScore', () => {
  it('should not detect anomaly for normal values', () => {
    const result = detectAnomalyZScore(105, 100, 10, 3);
    expect(result.isAnomaly).toBe(false);
    expect(result.zScore).toBe(0.5);
    expect(result.severity).toBe('normal');
  });

  it('should detect warning anomaly', () => {
    const result = detectAnomalyZScore(130, 100, 10, 3);
    expect(result.isAnomaly).toBe(true);
    expect(result.zScore).toBe(3);
    expect(result.severity).toBe('warning');
  });

  it('should detect critical anomaly', () => {
    const result = detectAnomalyZScore(160, 100, 10, 3);
    expect(result.isAnomaly).toBe(true);
    expect(result.zScore).toBe(6);
    expect(result.severity).toBe('critical');
  });

  it('should use default threshold', () => {
    const result = detectAnomalyZScore(130, 100, 10);
    expect(result.isAnomaly).toBe(true);
  });

  it('should handle custom threshold', () => {
    const result = detectAnomalyZScore(130, 100, 10, 4);
    expect(result.isAnomaly).toBe(false);
  });
});

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  afterEach(() => {
    detector.clear();
  });

  describe('constructor', () => {
    it('should use default config', () => {
      const d = new AnomalyDetector();
      expect(d).toBeDefined();
    });

    it('should accept custom config', () => {
      const d = new AnomalyDetector({
        zScoreThreshold: 4,
        minSampleSize: 20,
        windowSize: 200,
      });
      expect(d).toBeDefined();
    });

    it('should allow enabling/disabling', () => {
      const d = new AnomalyDetector({ enabled: false });
      const result = d.detectAnomaly('test', 100);
      expect(result).toBeNull();
    });
  });

  describe('addDataPoint', () => {
    it('should add first data point', () => {
      detector.addDataPoint('test', 100);
      const baseline = detector.getBaseline('test');
      expect(baseline).toBeNull();
    });

    it('should add multiple data points', () => {
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('test', 100 + i);
      }
      const baseline = detector.calculateBaseline('test');
      expect(baseline).not.toBeNull();
    });

    it('should respect window size', () => {
      const d = new AnomalyDetector({ windowSize: 10 });
      for (let i = 0; i < 20; i++) {
        d.addDataPoint('test', i);
      }
      // Only last 10 samples should be kept
      const baseline = d.calculateBaseline('test');
      expect(baseline?.sampleSize).toBe(10);
      expect(baseline?.min).toBe(10);
      expect(baseline?.max).toBe(19);
    });

    it('should not add data when disabled', () => {
      const d = new AnomalyDetector({ enabled: false });
      d.addDataPoint('test', 100);
      const baseline = d.getBaseline('test');
      expect(baseline).toBeNull();
    });
  });

  describe('calculateBaseline', () => {
    it('should return null with insufficient samples', () => {
      detector.addDataPoint('test', 100);
      const baseline = detector.calculateBaseline('test');
      expect(baseline).toBeNull();
    });

    it('should calculate baseline with minimum samples', () => {
      for (let i = 0; i < 10; i++) {
        detector.addDataPoint('test', 100 + i);
      }
      const baseline = detector.calculateBaseline('test');
      expect(baseline).not.toBeNull();
      expect(baseline?.metric).toBe('test');
      expect(baseline?.sampleSize).toBe(10);
    });

    it('should calculate correct statistics', () => {
      for (let i = 0; i < 100; i++) {
        detector.addDataPoint('test', i);
      }
      const baseline = detector.calculateBaseline('test');
      expect(baseline?.mean).toBeCloseTo(49.5, 1);
      expect(baseline?.min).toBe(0);
      expect(baseline?.max).toBe(99);
      expect(baseline?.p50).toBe(49); // 0-99的中位数是49
    });

    it('should calculate percentiles correctly', () => {
      for (let i = 0; i < 100; i++) {
        detector.addDataPoint('test', i);
      }
      const baseline = detector.calculateBaseline('test');
      expect(baseline?.p95).toBeGreaterThan(90);
      expect(baseline?.p99).toBeGreaterThan(95);
    });

    it('should handle constant values', () => {
      for (let i = 0; i < 10; i++) {
        detector.addDataPoint('test', 100);
      }
      const baseline = detector.calculateBaseline('test');
      expect(baseline?.mean).toBe(100);
      expect(baseline?.stdDev).toBe(1); // Prevents division by zero
    });

    it('should update lastUpdated timestamp', () => {
      for (let i = 0; i < 10; i++) {
        detector.addDataPoint('test', 100 + i);
      }
      const baseline = detector.calculateBaseline('test');
      expect(baseline?.lastUpdated).toBeLessThanOrEqual(Date.now());
      expect(baseline?.lastUpdated).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('getBaseline', () => {
    it('should return null for unknown metric', () => {
      const baseline = detector.getBaseline('unknown');
      expect(baseline).toBeNull();
    });

    it('should return calculated baseline', () => {
      for (let i = 0; i < 10; i++) {
        detector.addDataPoint('test', 100 + i);
      }
      detector.calculateBaseline('test');
      const baseline = detector.getBaseline('test');
      expect(baseline).not.toBeNull();
    });

    it('should update baseline on recalculation', () => {
      for (let i = 0; i < 10; i++) {
        detector.addDataPoint('test', 100 + i);
      }
      detector.calculateBaseline('test');
      
      // Add more data
      for (let i = 10; i < 20; i++) {
        detector.addDataPoint('test', 100 + i);
      }
      detector.calculateBaseline('test');
      
      const baseline = detector.getBaseline('test');
      expect(baseline?.sampleSize).toBe(20);
    });
  });

  describe('calculateZScore', () => {
    it('should calculate Z-score from baseline', () => {
      for (let i = 0; i < 100; i++) {
        detector.addDataPoint('test', i);
      }
      const baseline = detector.calculateBaseline('test');
      if (baseline) {
        const zScore = detector.calculateZScore(75, baseline);
        expect(zScore).toBeCloseTo(0.88, 1); // Updated to match actual calculation
      }
    });
  });

  describe('detectAnomaly', () => {
    it('should return null when not enough data', () => {
      detector.addDataPoint('test', 100);
      const result = detector.detectAnomaly('test', 1000);
      expect(result).toBeNull();
    });

    it('should return null when disabled', () => {
      const d = new AnomalyDetector({ enabled: false });
      for (let i = 0; i < 20; i++) {
        d.addDataPoint('test', 100 + i);
      }
      const result = d.detectAnomaly('test', 1000);
      expect(result).toBeNull();
    });

    it('should not detect anomaly for normal values', () => {
      // Training data: values around 100
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('test', 100 + Math.random() * 20 - 10);
      }
      
      const result = detector.detectAnomaly('test', 105);
      expect(result).not.toBeNull();
      expect(result?.isAnomaly).toBe(false);
      expect(result?.severity).toBe('normal');
    });

    it('should detect warning anomaly', () => {
      // Training data: values around 100 with low variance
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('test', 100 + i); // values 100-114
      }
      
      // Create baseline
      detector.calculateBaseline('test');
      
      const result = detector.detectAnomaly('test', 120); // Just outside normal range
      expect(result).not.toBeNull();
      expect(result?.isAnomaly).toBe(true);
      expect(result?.severity).toBe('warning');
    });

    it('should detect critical anomaly', () => {
      // Training data: values around 100
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('test', 100 + Math.random() * 20 - 10);
      }
      
      const result = detector.detectAnomaly('test', 160);
      expect(result).not.toBeNull();
      expect(result?.isAnomaly).toBe(true);
      expect(result?.severity).toBe('critical');
    });

    it('should add new value to history', () => {
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('test', 100 + i);
      }
      
      detector.detectAnomaly('test', 1000);
      const baseline = detector.calculateBaseline('test');
      expect(baseline?.sampleSize).toBe(16);
    });

    it('should include timestamp', () => {
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('test', 100 + i);
      }
      
      const result = detector.detectAnomaly('test', 105);
      expect(result?.timestamp).toBeLessThanOrEqual(Date.now());
      expect(result?.timestamp).toBeGreaterThan(Date.now() - 1000);
    });

    it('should track multiple metrics independently', () => {
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('metric1', 100 + i);
        detector.addDataPoint('metric2', 1000 + i * 10);
      }
      
      const result1 = detector.detectAnomaly('metric1', 200);
      const result2 = detector.detectAnomaly('metric2', 2000);
      
      expect(result1?.isAnomaly).toBe(true);
      expect(result2?.isAnomaly).toBe(true);
    });
  });

  describe('detectThresholdAnomaly', () => {
    it('should not detect anomaly below threshold', () => {
      const result = detector.detectThresholdAnomaly('test', 100, 200);
      expect(result.isAnomaly).toBe(false);
      expect(result.severity).toBe('normal');
    });

    it('should detect warning anomaly', () => {
      const result = detector.detectThresholdAnomaly('test', 250, 200);
      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe('warning');
    });

    it('should detect critical anomaly', () => {
      const result = detector.detectThresholdAnomaly('test', 400, 200);
      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe('critical');
    });

    it('should use threshold algorithm', () => {
      const result = detector.detectThresholdAnomaly('test', 300, 200);
      expect(result.algorithm).toBe('threshold');
    });
  });

  describe('clearMetric', () => {
    it('should clear single metric', () => {
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('test', 100 + i);
      }
      detector.calculateBaseline('test');
      
      detector.clearMetric('test');
      const baseline = detector.getBaseline('test');
      expect(baseline).toBeNull();
    });

    it('should keep other metrics', () => {
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('metric1', 100 + i);
        detector.addDataPoint('metric2', 200 + i);
      }
      detector.calculateBaseline('metric1');
      detector.calculateBaseline('metric2');
      
      detector.clearMetric('metric1');
      
      expect(detector.getBaseline('metric1')).toBeNull();
      expect(detector.getBaseline('metric2')).not.toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('metric1', 100 + i);
        detector.addDataPoint('metric2', 200 + i);
      }
      detector.calculateBaseline('metric1');
      detector.calculateBaseline('metric2');
      
      detector.clear();
      
      expect(detector.getBaseline('metric1')).toBeNull();
      expect(detector.getBaseline('metric2')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return empty array when no metrics', () => {
      const stats = detector.getStats();
      expect(stats).toEqual([]);
    });

    it('should return statistics for all metrics', () => {
      for (let i = 0; i < 15; i++) {
        detector.addDataPoint('metric1', 100 + i);
        detector.addDataPoint('metric2', 200 + i * 10);
      }
      detector.calculateBaseline('metric1');
      detector.calculateBaseline('metric2');
      
      const stats = detector.getStats();
      expect(stats.length).toBe(2);
      expect(stats[0].metric).toBeDefined();
      expect(stats[0].sampleSize).toBeGreaterThan(0);
      expect(stats[0].mean).toBeDefined();
      expect(stats[0].stdDev).toBeDefined();
    });

    it('should not include metrics without baselines', () => {
      detector.addDataPoint('test', 100);
      const stats = detector.getStats();
      expect(stats.length).toBe(0);
    });
  });
});

describe('Singleton anomalyDetector', () => {
  afterEach(() => {
    anomalyDetector.clear();
  });

  it('should be an instance of AnomalyDetector', () => {
    expect(anomalyDetector).toBeInstanceOf(AnomalyDetector);
  });

  it('should work independently', () => {
    for (let i = 0; i < 15; i++) {
      anomalyDetector.addDataPoint('test', 100 + i);
    }
    
    const result = anomalyDetector.detectAnomaly('test', 1000);
    expect(result?.isAnomaly).toBe(true);
  });
});

describe('Integration Tests', () => {
  it('should handle complete workflow', () => {
    const detector = new AnomalyDetector({ minSampleSize: 5 });
    
    // Training phase
    for (let i = 0; i < 10; i++) {
      detector.addDataPoint('response-time', 100 + Math.random() * 20);
    }
    
    // Normal operation
    const normal = detector.detectAnomaly('response-time', 110);
    expect(normal?.isAnomaly).toBe(false);
    
    // Anomaly detected
    const anomaly = detector.detectAnomaly('response-time', 500);
    expect(anomaly?.isAnomaly).toBe(true);
    
    // Get stats
    const stats = detector.getStats();
    expect(stats.length).toBe(1);
  });

  it('should handle multiple metrics with different baselines', () => {
    const detector = new AnomalyDetector();
    
    // Metric 1: low values
    for (let i = 0; i < 10; i++) {
      detector.addDataPoint('metric1', 10 + i);
    }
    
    // Metric 2: high values
    for (let i = 0; i < 10; i++) {
      detector.addDataPoint('metric2', 1000 + i * 100);
    }
    
    const result1 = detector.detectAnomaly('metric1', 50);
    const result2 = detector.detectAnomaly('metric2', 5000);
    
    expect(result1?.isAnomaly).toBe(true);
    expect(result2?.isAnomaly).toBe(true);
  });

  it('should adapt to gradual changes', () => {
    const detector = new AnomalyDetector({ minSampleSize: 5, windowSize: 15 });
    
    // Initial baseline: values around 100
    for (let i = 0; i < 15; i++) {
      detector.addDataPoint('test', 100 + Math.random() * 10);
    }
    
    const result1 = detector.detectAnomaly('test', 150);
    expect(result1?.isAnomaly).toBe(true);
    
    // Add enough new values to push out old ones from window
    for (let i = 0; i < 10; i++) {
      detector.addDataPoint('test', 150 + Math.random() * 10);
    }
    
    // Recalculate baseline to reflect new window
    detector.calculateBaseline('test');
    
    // Now 150 should be normal (within the new baseline's range)
    const result2 = detector.detectAnomaly('test', 155);
    expect(result2?.isAnomaly).toBe(false);
  });
});
