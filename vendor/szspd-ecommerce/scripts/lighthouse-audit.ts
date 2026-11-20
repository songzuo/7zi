/**
 * Lighthouse Performance Audit Runner
 *
 * Runs Lighthouse audits and generates reports
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import type {
  LighthouseReport,
  ExtractedMetrics,
  ExtractedIssue,
  ParsedLighthouseResults,
  PerformanceReport,
} from './lighthouse-types'

const OUTPUT_DIR = path.join(__dirname, '..', 'reports', 'lighthouse')

/**
 * Run Lighthouse audit
 */
export async function runLighthouseAudit(url: string, options = {}) {
  const defaultOptions = {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    output: ['json', 'html'],
    outputPath: path.join(OUTPUT_DIR, `lighthouse-report-${Date.now()}.html`),
    ...options,
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  try {
    const command = `lighthouse "${url}" --output=json,html --output-path="${defaultOptions.outputPath}" --only-categories=performance,accessibility,best-practices,seo --quiet`
    execSync(command, { stdio: 'inherit' })

    const jsonPath = defaultOptions.outputPath.replace('.html', '.report.json')
    const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

    return report
  } catch (error) {
    console.error('Lighthouse audit failed:', error)
    throw error
  }
}

/**
 * Parse Lighthouse results
 */
export function parseLighthouseResults(report: LighthouseReport): ParsedLighthouseResults {
  const categories = report.categories

  return {
    scores: {
      performance: Math.round(categories.performance.score * 100),
      accessibility: Math.round(categories.accessibility.score * 100),
      bestPractices: Math.round(categories['best-practices'].score * 100),
      seo: Math.round(categories.seo.score * 100),
    },
    metrics: extractMetrics(report.audits),
    issues: extractIssues(report.audits),
  }
}

/**
 * Extract key metrics
 */
function extractMetrics(audits: LighthouseReport['audits']): ExtractedMetrics {
  return {
    'First Contentful Paint': audits['first-contentful-paint']?.displayValue || 'N/A',
    'Speed Index': audits['speed-index']?.displayValue || 'N/A',
    'Largest Contentful Paint': audits['largest-contentful-paint']?.displayValue || 'N/A',
    'Time to Interactive': audits['interactive']?.displayValue || 'N/A',
    'Total Blocking Time': audits['total-blocking-time']?.displayValue || 'N/A',
    'Cumulative Layout Shift': audits['cumulative-layout-shift']?.displayValue || 'N/A',
  }
}

/**
 * Extract issues from audits
 */
function extractIssues(audits: LighthouseReport['audits']): ExtractedIssue[] {
  const issues: ExtractedIssue[] = []

  Object.values(audits).forEach(audit => {
    if (audit.score !== null && audit.score < 1) {
      issues.push({
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue,
      })
    }
  })

  return issues
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(results: ParsedLighthouseResults): PerformanceReport {
  const report: PerformanceReport = {
    timestamp: new Date().toISOString(),
    scores: results.scores,
    metrics: results.metrics,
    issues: results.issues.filter(i => i.score < 0.9),
    status: getPerformanceStatus(results.scores.performance),
  }

  return report
}

/**
 * Get performance status
 */
function getPerformanceStatus(score: number): 'excellent' | 'good' | 'needs-improvement' | 'poor' {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 50) return 'needs-improvement'
  return 'poor'
}

/**
 * Save report to file
 */
export function saveReport(report: PerformanceReport): string {
  const filePath = path.join(OUTPUT_DIR, `performance-report-${Date.now()}.json`)
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2))
  return filePath
}
