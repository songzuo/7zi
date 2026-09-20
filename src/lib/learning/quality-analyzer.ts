/**
 * Quality Analyzer - Analyzes and reports on feature quality
 * Phase 2: Comprehensive quality metrics and recommendations
 */

import type {
  FeatureVector,
  QualityMetrics,
  QualityAssessment,
  QualityIssue,
  QualityAnalyzerConfig,
} from './types'
import type { VectorStore } from './vector-store'

export class QualityAnalyzer {
  private config: QualityAnalyzerConfig
  private assessmentHistory: QualityAssessment[]

  constructor(config: Partial<QualityAnalyzerConfig> = {}) {
    this.config = {
      minAccuracy: 0.7,
      minCoverage: 0.5,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      minDiversity: 0.3,
      sampleSize: 100,
      ...config,
    }
    this.assessmentHistory = []
  }

  /**
   * Analyze quality of a vector store
   */
  async analyze(vectorStore: VectorStore): Promise<QualityAssessment> {
    const metrics = await this.calculateMetrics(vectorStore)
    const issues = this.identifyIssues(metrics)
    const recommendations = this.generateRecommendations(issues)

    const assessment: QualityAssessment = {
      metrics,
      issues,
      recommendations,
      timestamp: Date.now(),
    }

    this.assessmentHistory.push(assessment)
    // Keep only last 100 assessments
    if (this.assessmentHistory.length > 100) {
      this.assessmentHistory.shift()
    }

    return assessment
  }

  /**
   * Calculate all quality metrics
   */
  private async calculateMetrics(vectorStore: VectorStore): Promise<QualityMetrics> {
    const stats = vectorStore.getStatistics()
    const vectors = await this.getSampleVectors(vectorStore)

    if (vectors.length === 0) {
      return this.getEmptyMetrics()
    }

    return {
      accuracy: this.calculateAccuracy(vectors),
      precision: this.calculatePrecision(vectors),
      recall: this.calculateRecall(vectors),
      f1Score: this.calculateF1Score(vectors),
      coverage: this.calculateCoverage(vectors, stats),
      freshness: this.calculateFreshness(vectors),
      diversity: this.calculateDiversity(vectors),
      overall: 0, // Will be calculated after
    }
  }

  /**
   * Get sample vectors for analysis
   */
  private async getSampleVectors(vectorStore: VectorStore): Promise<FeatureVector[]> {
    const ids = vectorStore.getAllIds()
    const sampleSize = Math.min(ids.length, this.config.sampleSize)

    // Random sampling
    const sampledIds = this.shuffleArray(ids).slice(0, sampleSize)
    return sampledIds
      .map(id => vectorStore.getVector(id))
      .filter((v): v is FeatureVector => v !== undefined)
  }

  /**
   * Calculate accuracy (based on vector quality scores in metadata)
   */
  private calculateAccuracy(vectors: FeatureVector[]): number {
    const scores = vectors
      .map(v => v.metadata.accuracy as number | undefined)
      .filter((s): s is number => typeof s === 'number')

    if (scores.length === 0) return 0.5 // Default if no scores available
    return scores.reduce((sum, s) => sum + s, 0) / scores.length
  }

  /**
   * Calculate precision (based on relevance scores)
   */
  private calculatePrecision(vectors: FeatureVector[]): number {
    const scores = vectors
      .map(v => v.metadata.precision as number | undefined)
      .filter((s): s is number => typeof s === 'number')

    if (scores.length === 0) return 0.5
    return scores.reduce((sum, s) => sum + s, 0) / scores.length
  }

  /**
   * Calculate recall (based on coverage scores)
   */
  private calculateRecall(vectors: FeatureVector[]): number {
    const scores = vectors
      .map(v => v.metadata.recall as number | undefined)
      .filter((s): s is number => typeof s === 'number')

    if (scores.length === 0) return 0.5
    return scores.reduce((sum, s) => sum + s, 0) / scores.length
  }

  /**
   * Calculate F1 score
   */
  private calculateF1Score(vectors: FeatureVector[]): number {
    const precision = this.calculatePrecision(vectors)
    const recall = this.calculateRecall(vectors)

    if (precision + recall === 0) return 0
    return (2 * (precision * recall)) / (precision + recall)
  }

  /**
   * Calculate coverage (percentage of feature space covered)
   */
  private calculateCoverage(vectors: FeatureVector[], stats: { dimensions: number }): number {
    if (vectors.length === 0) return 0

    // Check how many dimensions have non-zero values across vectors
    const dimensions = stats.dimensions
    const dimensionCoverage = new Array(dimensions).fill(0)

    for (const vector of vectors) {
      for (let i = 0; i < vector.vector.length && i < dimensions; i++) {
        if (vector.vector[i] !== 0) {
          dimensionCoverage[i]++
        }
      }
    }

    // Calculate percentage of dimensions with coverage
    const coveredDimensions = dimensionCoverage.filter(c => c > 0).length
    return coveredDimensions / dimensions
  }

  /**
   * Calculate freshness (how recent the data is)
   */
  private calculateFreshness(vectors: FeatureVector[]): number {
    const now = Date.now()
    const maxAge = this.config.maxAge

    // Calculate average freshness score
    const freshnessScores = vectors.map(v => {
      const age = now - v.timestamp
      return Math.max(0, 1 - age / maxAge)
    })

    return freshnessScores.reduce((sum, s) => sum + s, 0) / freshnessScores.length
  }

  /**
   * Calculate diversity (how different vectors are from each other)
   */
  private calculateDiversity(vectors: FeatureVector[]): number {
    if (vectors.length < 2) return 0

    let totalDistance = 0
    let comparisons = 0

    // Sample pairs for efficiency
    const sampleSize = Math.min(vectors.length, 50)
    const sample = this.shuffleArray(vectors).slice(0, sampleSize)

    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        totalDistance += this.cosineDistance(sample[i].vector, sample[j].vector)
        comparisons++
      }
    }

    return comparisons > 0 ? totalDistance / comparisons : 0
  }

  /**
   * Cosine distance between two vectors
   */
  private cosineDistance(a: number[], b: number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    if (normA === 0 || normB === 0) return 1

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
    return 1 - similarity
  }

  /**
   * Identify quality issues based on metrics
   */
  private identifyIssues(metrics: QualityMetrics): QualityIssue[] {
    const issues: QualityIssue[] = []

    if (metrics.accuracy < this.config.minAccuracy) {
      issues.push({
        type: 'low_accuracy',
        severity: metrics.accuracy < 0.5 ? 'high' : 'medium',
        message: `Accuracy ${metrics.accuracy.toFixed(2)} is below minimum threshold ${this.config.minAccuracy}`,
        affectedFeatures: ['all'],
      })
    }

    if (metrics.coverage < this.config.minCoverage) {
      issues.push({
        type: 'low_coverage',
        severity: metrics.coverage < 0.3 ? 'high' : 'medium',
        message: `Coverage ${metrics.coverage.toFixed(2)} is below minimum threshold ${this.config.minCoverage}`,
        affectedFeatures: ['vector_dimensions'],
      })
    }

    if (metrics.freshness < 0.3) {
      issues.push({
        type: 'stale_data',
        severity: metrics.freshness < 0.1 ? 'high' : 'low',
        message: `Data freshness ${metrics.freshness.toFixed(2)} indicates outdated features`,
        affectedFeatures: ['temporal'],
      })
    }

    if (metrics.diversity < this.config.minDiversity) {
      issues.push({
        type: 'low_diversity',
        severity: metrics.diversity < 0.2 ? 'high' : 'low',
        message: `Diversity ${metrics.diversity.toFixed(2)} suggests redundant features`,
        affectedFeatures: ['similarity'],
      })
    }

    return issues
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: QualityIssue[]): string[] {
    const recommendations: string[] = []

    for (const issue of issues) {
      switch (issue.type) {
        case 'low_accuracy':
          recommendations.push('Review feature extraction logic and improve normalization')
          recommendations.push('Add more training data to improve feature quality')
          break
        case 'low_coverage':
          recommendations.push('Expand feature extraction to cover more dimensions')
          recommendations.push('Add new feature extractors for uncovered dimensions')
          break
        case 'stale_data':
          recommendations.push('Run feature extraction on recent data')
          recommendations.push('Set up automatic refresh interval for feature updates')
          break
        case 'low_diversity':
          recommendations.push('Remove redundant or highly correlated features')
          recommendations.push('Add orthogonal feature dimensions to increase diversity')
          break
      }
    }

    return [...new Set(recommendations)] // Remove duplicates
  }

  /**
   * Get empty metrics for empty stores
   */
  private getEmptyMetrics(): QualityMetrics {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      coverage: 0,
      freshness: 0,
      diversity: 0,
      overall: 0,
    }
  }

  /**
   * Shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Get assessment history
   */
  getHistory(): QualityAssessment[] {
    return [...this.assessmentHistory]
  }

  /**
   * Get trend analysis
   */
  getTrend(): {
    accuracyTrend: 'improving' | 'declining' | 'stable'
    overallTrend: 'improving' | 'declining' | 'stable'
    recentChange: number
  } {
    if (this.assessmentHistory.length < 2) {
      return { accuracyTrend: 'stable', overallTrend: 'stable', recentChange: 0 }
    }

    const recent = this.assessmentHistory.slice(-10)
    const first = recent[0]
    const last = recent[recent.length - 1]

    const accuracyChange = last.metrics.accuracy - first.metrics.accuracy
    const overallChange = last.metrics.overall - first.metrics.overall

    return {
      accuracyTrend: this.getTrendDirection(accuracyChange),
      overallTrend: this.getTrendDirection(overallChange),
      recentChange: overallChange,
    }
  }

  /**
   * Get trend direction
   */
  private getTrendDirection(change: number): 'improving' | 'declining' | 'stable' {
    if (Math.abs(change) < 0.05) return 'stable'
    return change > 0 ? 'improving' : 'declining'
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.assessmentHistory = []
  }

  /**
   * Calculate overall score from metrics
   */
  calculateOverallScore(metrics: QualityMetrics): number {
    const weights = {
      accuracy: 0.25,
      precision: 0.1,
      recall: 0.1,
      f1Score: 0.15,
      coverage: 0.15,
      freshness: 0.15,
      diversity: 0.1,
    }

    return (
      metrics.accuracy * weights.accuracy +
      metrics.precision * weights.precision +
      metrics.recall * weights.recall +
      metrics.f1Score * weights.f1Score +
      metrics.coverage * weights.coverage +
      metrics.freshness * weights.freshness +
      metrics.diversity * weights.diversity
    )
  }

  /**
   * Generate quality report
   */
  generateReport(assessment: QualityAssessment): string {
    const lines: string[] = [
      '=== Feature Quality Report ===',
      `Generated: ${new Date(assessment.timestamp).toISOString()}`,
      '',
      'Metrics:',
      `  Accuracy:  ${(assessment.metrics.accuracy * 100).toFixed(1)}%`,
      `  Precision: ${(assessment.metrics.precision * 100).toFixed(1)}%`,
      `  Recall:    ${(assessment.metrics.recall * 100).toFixed(1)}%`,
      `  F1 Score:  ${(assessment.metrics.f1Score * 100).toFixed(1)}%`,
      `  Coverage:  ${(assessment.metrics.coverage * 100).toFixed(1)}%`,
      `  Freshness: ${(assessment.metrics.freshness * 100).toFixed(1)}%`,
      `  Diversity: ${(assessment.metrics.diversity * 100).toFixed(1)}%`,
      '',
    ]

    if (assessment.issues.length > 0) {
      lines.push('Issues:')
      for (const issue of assessment.issues) {
        lines.push(`  [${issue.severity.toUpperCase()}] ${issue.message}`)
      }
      lines.push('')
    }

    if (assessment.recommendations.length > 0) {
      lines.push('Recommendations:')
      for (const rec of assessment.recommendations) {
        lines.push(`  - ${rec}`)
      }
    }

    return lines.join('\n')
  }
}
