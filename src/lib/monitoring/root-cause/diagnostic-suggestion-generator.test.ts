// @ts-nocheck
/**
 * Diagnostic Suggestion Generator Tests
 * Tests for auto-diagnostic suggestion generation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DiagnosticSuggestionGenerator,
  diagnosticGenerator,
  createDiagnosticReport,
  type DiagnosticSuggestion,
  type DiagnosticReport,
} from './diagnostic-suggestion-generator'
import { BottleneckDetector, createMockPerformanceProfile } from './bottleneck-detector'

describe('DiagnosticSuggestionGenerator', () => {
  let generator: DiagnosticSuggestionGenerator

  beforeEach(() => {
    generator = new DiagnosticSuggestionGenerator()
  })

  describe('generateReport', () => {
    it('should generate a diagnostic report', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        firstContentfulPaint: 4000,
        slowDatabaseQueries: 3,
        databaseQueries: 100,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)

      expect(report).toBeDefined()
      expect(report.id).toMatch(/^diag-/)
      expect(report.timestamp).toBeGreaterThan(0)
      expect(report.suggestions).toBeInstanceOf(Array)
      expect(report.overallSeverity).toMatch(/low|medium|high|critical/)
      expect(report.priorityScore).toBeGreaterThanOrEqual(0)
    })

    it('should sort suggestions by severity', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        firstContentfulPaint: 5000, // critical
        memoryGrowthRate: 10, // critical
        scriptErrors: 1, // medium
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)

      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      for (let i = 1; i < report.suggestions.length; i++) {
        expect(severityOrder[report.suggestions[i - 1].severity]).toBeGreaterThanOrEqual(
          severityOrder[report.suggestions[i].severity]
        )
      }
    })
  })

  describe('Suggestion Quality', () => {
    it('should include action items for each suggestion', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        slowDatabaseQueries: 5,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)
      const dbSuggestion = report.suggestions.find(s => s.type === 'database')

      expect(dbSuggestion?.actionItems.length).toBeGreaterThan(0)
      expect(dbSuggestion?.actionItems[0]).toBeDefined()
    })

    it('should include documentation links', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        slowDatabaseQueries: 3,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)

      for (const suggestion of report.suggestions) {
        expect(suggestion.relatedDocs.length).toBeGreaterThan(0)
      }
    })

    it('should provide estimated impact', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        slowDatabaseQueries: 5,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)

      for (const suggestion of report.suggestions) {
        expect(suggestion.estimatedImpact).toBeDefined()
        expect(typeof suggestion.estimatedImpact).toBe('string')
      }
    })

    it('should include complexity and risk levels', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        memoryGrowthRate: 10,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)

      for (const suggestion of report.suggestions) {
        expect(suggestion.complexity).toMatch(/low|medium|high/)
        expect(suggestion.riskLevel).toMatch(/low|medium|high/)
      }
    })
  })

  describe('Database Suggestions', () => {
    it('should provide specific suggestions for slow queries', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        slowDatabaseQueries: 10,
        averageDatabaseQueryTime: 2000,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)
      const dbSuggestions = report.suggestions.filter(s => s.type === 'database')

      expect(dbSuggestions.length).toBeGreaterThan(0)
      const slowQueryRec = dbSuggestions.find(s => s.title.toLowerCase().includes('optimize'))
      expect(slowQueryRec?.description).toContain('slow')
    })

    it('should provide suggestions for N+1 patterns', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        databaseQueries: 100,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)
      const n1Suggestion = report.suggestions.find(
        s => s.title.toLowerCase().includes('n+1') || s.description.toLowerCase().includes('n+1')
      )

      expect(n1Suggestion).toBeDefined()
    })
  })

  describe('API Suggestions', () => {
    it('should provide suggestions for slow API calls', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        slowExternalApiCalls: 5,
        averageExternalApiTime: 3000,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)
      const apiSuggestions = report.suggestions.filter(s => s.type === 'api')

      expect(apiSuggestions.length).toBeGreaterThan(0)
    })

    it('should provide suggestions for high error rates', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        externalApiErrorRate: 0.3, // 30% error rate - high
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)
      const errorSuggestion = report.suggestions.find(s => s.title.toLowerCase().includes('error'))

      expect(errorSuggestion).toBeDefined()
      // 30% error rate produces 'high' severity
      expect(errorSuggestion?.severity).toMatch(/high|critical/)
    })
  })

  describe('Memory Suggestions', () => {
    it('should provide suggestions for memory leaks', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        memoryGrowthRate: 15,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)
      const memorySuggestions = report.suggestions.filter(s => s.type === 'memory')

      expect(memorySuggestions.length).toBeGreaterThan(0)
      const leakSuggestion = memorySuggestions.find(s => s.title.toLowerCase().includes('leak'))
      expect(leakSuggestion?.actionItems).toContainEqual(expect.stringContaining('heap'))
    })

    it('should include DevTools documentation for memory issues', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        memoryGrowthRate: 10,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)
      const memorySuggestion = report.suggestions.find(s => s.type === 'memory')

      // Should have documentation links
      expect(memorySuggestion?.relatedDocs.length).toBeGreaterThan(0)
      // At least one link should be related to memory or performance
      const hasMemoryDoc = memorySuggestion?.relatedDocs.some(
        doc => doc.includes('memory') || doc.includes('devtools') || doc.includes('performance')
      )
      expect(hasMemoryDoc).toBe(true)
    })
  })

  describe('createDiagnosticReport', () => {
    it('should create a report from bottlenecks', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        firstContentfulPaint: 4000,
      })
      const analysis = detector.analyze(profile)

      const report = createDiagnosticReport({
        bottlenecks: analysis.bottlenecks,
      })

      expect(report).toBeDefined()
      expect(report.suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('Priority Score', () => {
    it('should calculate higher priority for more critical issues', () => {
      const lowProfile = createMockPerformanceProfile({
        firstContentfulPaint: 2000, // slightly over
      })

      const highProfile = createMockPerformanceProfile({
        firstContentfulPaint: 5000, // critical
        memoryGrowthRate: 15,
      })

      const detector = new BottleneckDetector()
      const lowAnalysis = detector.analyze(lowProfile)
      const highAnalysis = detector.analyze(highProfile)

      const lowReport = generator.generateReport(lowAnalysis.bottlenecks)
      const highReport = generator.generateReport(highAnalysis.bottlenecks)

      expect(highReport.priorityScore).toBeGreaterThan(lowReport.priorityScore)
    })
  })

  describe('Overall Severity', () => {
    it('should return critical for critical issues', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile({
        memoryGrowthRate: 20,
        externalApiErrorRate: 0.3,
      })
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)

      expect(report.overallSeverity).toBe('critical')
    })

    it('should return low for no issues', () => {
      const detector = new BottleneckDetector()
      const profile = createMockPerformanceProfile()
      const analysis = detector.analyze(profile)

      const report = generator.generateReport(analysis.bottlenecks)

      expect(report.overallSeverity).toBe('low')
    })
  })
})
