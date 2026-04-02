/**
 * Metrics Report Generator Tests
 * 指标报告生成器单元测试
 */

import { MetricsReportGenerator, generateHealthCheck } from '../metrics-report'
import type { PerformanceMetrics } from '../metrics-types'

describe('MetricsReportGenerator', () => {
  let generator: MetricsReportGenerator

  const sampleMetrics: PerformanceMetrics = {
    system: {
      cpuUsage: 45.5,
      memoryUsage: 62.3,
      heapUsed: 256,
      heapTotal: 512,
      timestamp: Date.now(),
    },
    responseTime: {
      average: 125.5,
      min: 45,
      max: 850,
      p50: 100,
      p95: 500,
      p99: 750,
      sampleCount: 1000,
      timestamp: Date.now(),
    },
    errorRate: {
      rate: 2.5,
      totalRequests: 5000,
      errorCount: 125,
      errorsByType: {
        NetworkError: 80,
        TimeoutError: 45,
      },
      errorsByStatus: {
        '500': 60,
        '404': 40,
        '408': 25,
      },
      timestamp: Date.now(),
    },
    throughput: {
      requestsPerMinute: 1200,
      requestsPerSecond: 20,
      timeWindowMs: 60000,
      totalRequests: 5000,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
    version: '1.9.0',
  }

  beforeEach(() => {
    generator = new MetricsReportGenerator()
  })

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const g = new MetricsReportGenerator()
      expect(g.getConfig().format).toBe('text')
      expect(g.getConfig().includeSystem).toBe(true)
    })

    it('should create instance with custom config', () => {
      const g = new MetricsReportGenerator({
        format: 'html',
        includeHistory: true,
      })
      expect(g.getConfig().format).toBe('html')
      expect(g.getConfig().includeHistory).toBe(true)
    })
  })

  describe('generateTextReport', () => {
    it('should generate text report with all sections', () => {
      const report = generator.generateTextReport(sampleMetrics)

      expect(report).toContain('Performance Metrics Report')
      expect(report).toContain('CPU Usage')
      expect(report).toContain('Memory Usage')
      expect(report).toContain('Response Time')
      expect(report).toContain('Error Rate')
      expect(report).toContain('Throughput')
      expect(report).toContain('v1.9.0')
    })

    it('should include system metrics in text report', () => {
      const report = generator.generateTextReport(sampleMetrics)
      expect(report).toContain('45.5%')
      expect(report).toContain('62.3%')
    })

    it('should include response time metrics in text report', () => {
      const report = generator.generateTextReport(sampleMetrics)
      expect(report).toContain('Average')
      expect(report).toContain('P50')
      expect(report).toContain('P95')
      expect(report).toContain('P99')
    })

    it('should include error rate in text report', () => {
      const report = generator.generateTextReport(sampleMetrics)
      expect(report).toContain('2.5%')
      expect(report).toContain('5000')
      expect(report).toContain('125')
    })

    it('should include throughput in text report', () => {
      const report = generator.generateTextReport(sampleMetrics)
      expect(report).toContain('1200')
      expect(report).toContain('20.00')
    })

    it('should exclude system section when disabled', () => {
      const g = new MetricsReportGenerator({ includeSystem: false })
      const report = g.generateTextReport(sampleMetrics)

      expect(report).not.toContain('CPU Usage')
      expect(report).not.toContain('Memory Usage')
    })
  })

  describe('generateHtmlReport', () => {
    it('should generate valid HTML report', () => {
      const report = generator.generateHtmlReport(sampleMetrics)

      expect(report).toContain('<!DOCTYPE html>')
      expect(report).toContain('<html')
      expect(report).toContain('<head>')
      expect(report).toContain('<body>')
      expect(report).toContain('</html>')
    })

    it('should include metrics in HTML report', () => {
      const report = generator.generateHtmlReport(sampleMetrics)

      expect(report).toContain('System Metrics')
      expect(report).toContain('Response Time Metrics')
      expect(report).toContain('Error Rate Metrics')
      expect(report).toContain('Throughput Metrics')
    })

    it('should apply status colors correctly', () => {
      const highCpuMetrics: PerformanceMetrics = {
        ...sampleMetrics,
        system: {
          ...sampleMetrics.system,
          cpuUsage: 95,
          memoryUsage: 95,
        },
      }

      const report = generator.generateHtmlReport(highCpuMetrics)

      expect(report).toContain('danger')
    })
  })

  describe('generateJsonReport', () => {
    it('should generate valid JSON', () => {
      const report = generator.generateJsonReport(sampleMetrics)

      expect(() => JSON.parse(report)).not.toThrow()
    })

    it('should include all metrics in JSON', () => {
      const report = generator.generateJsonReport(sampleMetrics)
      const parsed = JSON.parse(report)

      expect(parsed.system).toBeDefined()
      expect(parsed.responseTime).toBeDefined()
      expect(parsed.errorRate).toBeDefined()
      expect(parsed.throughput).toBeDefined()
      expect(parsed.version).toBe('1.9.0')
    })

    it('should include timestamp and generatedAt', () => {
      const report = generator.generateJsonReport(sampleMetrics)
      const parsed = JSON.parse(report)

      expect(parsed.timestamp).toBeDefined()
      expect(parsed.generatedAt).toBeDefined()
    })

    it('should exclude sections when disabled', () => {
      const g = new MetricsReportGenerator({
        includeSystem: false,
        includeErrorRate: false,
      })

      const report = g.generateJsonReport(sampleMetrics)
      const parsed = JSON.parse(report)

      expect(parsed.system).toBeUndefined()
      expect(parsed.errorRate).toBeUndefined()
      expect(parsed.responseTime).toBeDefined()
    })
  })

  describe('generate (auto format)', () => {
    it('should generate text report by default', () => {
      const report = generator.generate(sampleMetrics)
      expect(report).toContain('Performance Metrics Report')
    })

    it('should generate HTML when configured', () => {
      const g = new MetricsReportGenerator({ format: 'html' })
      const report = g.generate(sampleMetrics)
      expect(report).toContain('<!DOCTYPE html>')
    })

    it('should generate JSON when configured', () => {
      const g = new MetricsReportGenerator({ format: 'json' })
      const report = g.generate(sampleMetrics)
      expect(() => JSON.parse(report)).not.toThrow()
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', () => {
      generator.updateConfig({ format: 'html' })
      expect(generator.getConfig().format).toBe('html')
    })
  })
})

describe('generateHealthCheck', () => {
  const healthyMetrics: PerformanceMetrics = {
    system: {
      cpuUsage: 30,
      memoryUsage: 40,
      timestamp: Date.now(),
    },
    responseTime: {
      average: 100,
      min: 50,
      max: 300,
      p50: 80,
      p95: 200,
      p99: 280,
      sampleCount: 1000,
      timestamp: Date.now(),
    },
    errorRate: {
      rate: 0.5,
      totalRequests: 1000,
      errorCount: 5,
      timestamp: Date.now(),
    },
    throughput: {
      requestsPerMinute: 600,
      requestsPerSecond: 10,
      timeWindowMs: 60000,
      totalRequests: 1000,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
    version: '1.9.0',
  }

  const warningMetrics: PerformanceMetrics = {
    ...healthyMetrics,
    system: {
      cpuUsage: 75,
      memoryUsage: 80,
      timestamp: Date.now(),
    },
  }

  const criticalMetrics: PerformanceMetrics = {
    ...healthyMetrics,
    system: {
      cpuUsage: 95,
      memoryUsage: 95,
      timestamp: Date.now(),
    },
    errorRate: {
      rate: 10,
      totalRequests: 1000,
      errorCount: 100,
      timestamp: Date.now(),
    },
    responseTime: {
      ...healthyMetrics.responseTime,
      p95: 5000,
    },
  }

  it('should return healthy status for good metrics', () => {
    const result = generateHealthCheck(healthyMetrics)

    expect(result.status).toBe('healthy')
    expect(result.checks).toHaveLength(4)
    expect(result.timestamp).toBeGreaterThan(0)
  })

  it('should return warning status for high values', () => {
    const result = generateHealthCheck(warningMetrics)

    expect(result.status).toBe('warning')
  })

  it('should return critical status for very high values', () => {
    const result = generateHealthCheck(criticalMetrics)

    expect(result.status).toBe('critical')
  })

  it('should check CPU usage', () => {
    const result = generateHealthCheck(healthyMetrics)
    const cpuCheck = result.checks.find(c => c.name === 'CPU Usage')

    expect(cpuCheck).toBeDefined()
    expect(cpuCheck?.status).toBe('healthy')
  })

  it('should check memory usage', () => {
    const result = generateHealthCheck(healthyMetrics)
    const memoryCheck = result.checks.find(c => c.name === 'Memory Usage')

    expect(memoryCheck).toBeDefined()
    expect(memoryCheck?.status).toBe('healthy')
  })

  it('should check error rate', () => {
    const result = generateHealthCheck(healthyMetrics)
    const errorCheck = result.checks.find(c => c.name === 'Error Rate')

    expect(errorCheck).toBeDefined()
    expect(errorCheck?.status).toBe('healthy')
  })

  it('should check response time', () => {
    const result = generateHealthCheck(healthyMetrics)
    const responseCheck = result.checks.find(c => c.name === 'Response Time (P95)')

    expect(responseCheck).toBeDefined()
    expect(responseCheck?.status).toBe('healthy')
  })

  it('should use custom thresholds', () => {
    const result = generateHealthCheck(healthyMetrics, {
      cpuWarning: 20,
      cpuCritical: 30,
    })

    const cpuCheck = result.checks.find(c => c.name === 'CPU Usage')
    // Healthy metrics with 30% CPU should be critical with 20/30 thresholds (30 >= 30 is critical)
    expect(cpuCheck?.status).toBe('critical')
  })
})
