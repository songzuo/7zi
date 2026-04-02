/**
 * React Compiler Diagnostics - Reporter Tests
 */

import { describe, it, expect } from 'vitest'
import {
  generateCompatibilityReport,
  generateMarkdownReport,
  generateHTMLReport,
  reportToString,
} from '../../../src/lib/react-compiler/diagnostics/reporter'

describe('Reporter', () => {
  describe('generateCompatibilityReport', () => {
    it('应该生成完整报告', () => {
      const scanResult = {
        totalFiles: 10,
        compatibleFiles: 7,
        incompatibleFiles: 3,
        reports: [
          {
            filePath: 'test.tsx',
            componentName: 'Test',
            issues: [
              {
                type: 'unsupported-pattern' as const,
                message: 'Test issue',
                severity: 'high' as const,
              },
            ],
            canCompile: false,
            estimatedEffort: 'high' as const,
          },
        ],
        summary: {
          byType: { 'unsupported-pattern': 1 },
          bySeverity: { low: 0, medium: 0, high: 1 },
        },
      }

      const report = generateCompatibilityReport(scanResult)

      expect(report.format).toBe('json')
      expect(report.summary.totalFiles).toBe(10)
      expect(report.summary.compatibleFiles).toBe(7)
      expect(report.summary.incompatibleFiles).toBe(3)
      expect(report.summary.compatibilityRate).toBe(70)
      expect(report.details).toBeDefined()
      expect(report.recommendations.length).toBeGreaterThan(0)
    })

    it('应该生成包含详细信息的报告', () => {
      const scanResult = {
        totalFiles: 5,
        compatibleFiles: 3,
        incompatibleFiles: 2,
        reports: [
          {
            filePath: 'high.tsx',
            componentName: 'High',
            issues: [
              {
                type: 'unsupported-pattern' as const,
                message: 'High issue',
                severity: 'high' as const,
              },
            ],
            canCompile: false,
            estimatedEffort: 'high' as const,
          },
          {
            filePath: 'medium.tsx',
            componentName: 'Medium',
            issues: [
              {
                type: 'side-effect' as const,
                message: 'Medium issue',
                severity: 'medium' as const,
              },
            ],
            canCompile: true,
            estimatedEffort: 'low' as const,
          },
          {
            filePath: 'low.tsx',
            componentName: 'Low',
            issues: [
              {
                type: 'performance-warning' as const,
                message: 'Low issue',
                severity: 'low' as const,
              },
            ],
            canCompile: true,
            estimatedEffort: 'none' as const,
          },
        ],
        summary: {
          byType: { 'unsupported-pattern': 1, 'side-effect': 1, 'performance-warning': 1 },
          bySeverity: { low: 1, medium: 1, high: 1 },
        },
      }

      const report = generateCompatibilityReport(scanResult, { includeDetails: true })

      expect(report.details).toBeDefined()
      expect(report.details!.highSeverityIssues.length).toBe(1)
      expect(report.details!.mediumSeverityIssues.length).toBe(1)
      expect(report.details!.lowSeverityIssues.length).toBe(1)
    })

    it('应该生成不包含详细信息的报告', () => {
      const scanResult = {
        totalFiles: 5,
        compatibleFiles: 5,
        incompatibleFiles: 0,
        reports: [],
        summary: {
          byType: {},
          bySeverity: { low: 0, medium: 0, high: 0 },
        },
      }

      const report = generateCompatibilityReport(scanResult, { includeDetails: false })

      expect(report.details).toBeUndefined()
    })
  })

  describe('generateMarkdownReport', () => {
    it('应该生成 Markdown 格式报告', () => {
      const scanResult = {
        totalFiles: 10,
        compatibleFiles: 8,
        incompatibleFiles: 2,
        reports: [
          {
            filePath: 'test.tsx',
            componentName: 'Test',
            issues: [
              {
                type: 'unsupported-pattern' as const,
                message: 'Test issue',
                severity: 'high' as const,
                line: 10,
                suggestion: 'Fix it',
              },
            ],
            canCompile: false,
            estimatedEffort: 'high' as const,
          },
        ],
        summary: {
          byType: { 'unsupported-pattern': 1 },
          bySeverity: { low: 0, medium: 0, high: 1 },
        },
      }

      const report = generateCompatibilityReport(scanResult, {
        format: 'markdown',
        includeDetails: true,
      })
      const markdown = generateMarkdownReport(report)

      expect(markdown).toContain('# React Compiler 兼容性报告')
      expect(markdown).toContain('## 📊 摘要')
      expect(markdown).toContain('## 🔍 详细问题')
      expect(markdown).toContain('### 🔴 高严重程度问题')
      expect(markdown).toContain('## 💡 建议')
      expect(markdown).toContain('## 📈 问题统计')
    })

    it('应该生成包含建议的 Markdown 报告', () => {
      const scanResult = {
        totalFiles: 100,
        compatibleFiles: 95,
        incompatibleFiles: 5,
        reports: [],
        summary: {
          byType: {},
          bySeverity: { low: 0, medium: 0, high: 0 },
        },
      }

      const report = generateCompatibilityReport(scanResult)
      const markdown = generateMarkdownReport(report)

      expect(markdown).toContain('✅ 项目整体兼容性良好')
    })

    it('应该生成低兼容性警告', () => {
      const scanResult = {
        totalFiles: 100,
        compatibleFiles: 50,
        incompatibleFiles: 50,
        reports: [],
        summary: {
          byType: {},
          bySeverity: { low: 0, medium: 0, high: 0 },
        },
      }

      const report = generateCompatibilityReport(scanResult)
      const markdown = generateMarkdownReport(report)

      expect(markdown).toContain('❌ 项目兼容性较低')
    })
  })

  describe('generateHTMLReport', () => {
    it('应该生成 HTML 格式报告', () => {
      const scanResult = {
        totalFiles: 10,
        compatibleFiles: 7,
        incompatibleFiles: 3,
        reports: [
          {
            filePath: 'test.tsx',
            componentName: 'Test',
            issues: [
              {
                type: 'unsupported-pattern' as const,
                message: 'Test issue',
                severity: 'high' as const,
              },
            ],
            canCompile: false,
            estimatedEffort: 'high' as const,
          },
          {
            filePath: 'medium.tsx',
            componentName: 'Medium',
            issues: [
              {
                type: 'side-effect' as const,
                message: 'Medium issue',
                severity: 'medium' as const,
              },
            ],
            canCompile: true,
            estimatedEffort: 'low' as const,
          },
          {
            filePath: 'low.tsx',
            componentName: 'Low',
            issues: [
              {
                type: 'performance-warning' as const,
                message: 'Low issue',
                severity: 'low' as const,
              },
            ],
            canCompile: true,
            estimatedEffort: 'none' as const,
          },
        ],
        summary: {
          byType: { 'unsupported-pattern': 1, 'side-effect': 1, 'performance-warning': 1 },
          bySeverity: { low: 1, medium: 1, high: 1 },
        },
      }

      const report = generateCompatibilityReport(scanResult, { includeDetails: true })
      const html = generateHTMLReport(report)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html lang="zh-CN">')
      expect(html).toContain('<title>React Compiler 兼容性报告</title>')
      expect(html).toContain('class="summary-card"')
      expect(html).toContain('class="issue high"')
      expect(html).toContain('class="issue medium"')
      expect(html).toContain('class="issue low"')
      expect(html).toContain('class="recommendations"')
      expect(html).toContain('class="stat-grid"')
    })

    it('应该生成简洁的 HTML 报告', () => {
      const scanResult = {
        totalFiles: 5,
        compatibleFiles: 5,
        incompatibleFiles: 0,
        reports: [],
        summary: {
          byType: {},
          bySeverity: { low: 0, medium: 0, high: 0 },
        },
      }

      const report = generateCompatibilityReport(scanResult)
      const html = generateHTMLReport(report)

      expect(html).toContain('总文件数')
      expect(html).toContain('兼容文件')
      expect(html).toContain('100')
    })
  })

  describe('reportToString', () => {
    it('应该将 JSON 格式报告转换为字符串', () => {
      const scanResult = {
        totalFiles: 10,
        compatibleFiles: 8,
        incompatibleFiles: 2,
        reports: [],
        summary: {
          byType: {},
          bySeverity: { low: 0, medium: 0, high: 0 },
        },
      }

      const report = generateCompatibilityReport(scanResult, { format: 'json' })
      const str = reportToString(report)

      expect(str).toContain('"format": "json"')
      expect(str).toContain('"totalFiles": 10')
    })

    it('应该将 Markdown 格式报告转换为字符串', () => {
      const scanResult = {
        totalFiles: 10,
        compatibleFiles: 8,
        incompatibleFiles: 2,
        reports: [],
        summary: {
          byType: {},
          bySeverity: { low: 0, medium: 0, high: 0 },
        },
      }

      const report = generateCompatibilityReport(scanResult, { format: 'markdown' })
      const str = reportToString(report)

      expect(str).toContain('# React Compiler 兼容性报告')
    })

    it('应该将 HTML 格式报告转换为字符串', () => {
      const scanResult = {
        totalFiles: 10,
        compatibleFiles: 8,
        incompatibleFiles: 2,
        reports: [],
        summary: {
          byType: {},
          bySeverity: { low: 0, medium: 0, high: 0 },
        },
      }

      const report = generateCompatibilityReport(scanResult, { format: 'html' })
      const str = reportToString(report)

      expect(str).toContain('<!DOCTYPE html>')
      expect(str).toContain('<html lang="zh-CN">')
    })
  })

  describe('建议生成', () => {
    it('应该生成高严重程度问题建议', () => {
      const scanResult = {
        totalFiles: 10,
        compatibleFiles: 7,
        incompatibleFiles: 3,
        reports: [
          {
            filePath: 'test.tsx',
            issues: [
              { type: 'unsupported-pattern' as const, message: 'Test', severity: 'high' as const },
            ],
            canCompile: false,
            estimatedEffort: 'high' as const,
          },
        ],
        summary: {
          byType: { 'unsupported-pattern': 1 },
          bySeverity: { low: 0, medium: 0, high: 1 },
        },
      }

      const report = generateCompatibilityReport(scanResult)

      expect(report.recommendations.some(r => r.includes('高严重程度'))).toBe(true)
    })

    it('应该生成最常见问题建议', () => {
      const scanResult = {
        totalFiles: 10,
        compatibleFiles: 5,
        incompatibleFiles: 5,
        reports: [
          {
            filePath: 'test1.tsx',
            issues: [
              { type: 'unsupported-pattern' as const, message: 'Test', severity: 'high' as const },
            ],
            canCompile: false,
            estimatedEffort: 'high' as const,
          },
          {
            filePath: 'test2.tsx',
            issues: [
              { type: 'unsupported-pattern' as const, message: 'Test', severity: 'high' as const },
            ],
            canCompile: false,
            estimatedEffort: 'high' as const,
          },
        ],
        summary: {
          byType: { 'unsupported-pattern': 2 },
          bySeverity: { low: 0, medium: 0, high: 2 },
        },
      }

      const report = generateCompatibilityReport(scanResult)

      expect(report.recommendations.some(r => r.includes('最常见的问题类型'))).toBe(true)
    })
  })
})
