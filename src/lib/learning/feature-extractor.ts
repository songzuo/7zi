/**
 * Feature Extractor - Extracts features from various data sources
 * Phase 2: Enhanced with metadata and normalization
 */

import type { FeatureExtractionResult, FeatureExtractorConfig } from './types'

export class FeatureExtractor {
  private config: FeatureExtractorConfig
  private featureHistory: Map<string, FeatureExtractionResult[]>

  constructor(config: Partial<FeatureExtractorConfig> = {}) {
    this.config = {
      dimensions: 128,
      normalize: true,
      includeMetadata: true,
      ...config,
    }
    this.featureHistory = new Map()
  }

  /**
   * Extract features from text data
   */
  extractFromText(text: string, metadata: Record<string, unknown> = {}): FeatureExtractionResult {
    const features = this.computeTextFeatures(text)
    const vector = this.featuresToVector(features)

    const result: FeatureExtractionResult = {
      features,
      vector,
      confidence: this.calculateConfidence(features),
      metadata: this.config.includeMetadata ? { ...metadata, type: 'text' } : {},
    }

    this.recordExtraction('text', result)
    return result
  }

  /**
   * Extract features from structured data
   */
  extractFromStructured(
    data: Record<string, unknown>,
    metadata: Record<string, unknown> = {}
  ): FeatureExtractionResult {
    const features = this.computeStructuredFeatures(data)
    const vector = this.featuresToVector(features)

    const result: FeatureExtractionResult = {
      features,
      vector,
      confidence: this.calculateConfidence(features),
      metadata: this.config.includeMetadata ? { ...metadata, type: 'structured' } : {},
    }

    this.recordExtraction('structured', result)
    return result
  }

  /**
   * Extract features from interaction data
   */
  extractFromInteraction(
    interaction: {
      userMessage: string
      assistantResponse: string
      timestamp: number
      rating?: number
    },
    metadata: Record<string, unknown> = {}
  ): FeatureExtractionResult {
    const features = this.computeInteractionFeatures(interaction)
    const vector = this.featuresToVector(features)

    const result: FeatureExtractionResult = {
      features,
      vector,
      confidence: this.calculateConfidence(features),
      metadata: this.config.includeMetadata ? { ...metadata, type: 'interaction' } : {},
    }

    this.recordExtraction('interaction', result)
    return result
  }

  /**
   * Extract features using custom extractor
   */
  extractCustom(
    data: unknown,
    extractorName: string,
    metadata: Record<string, unknown> = {}
  ): FeatureExtractionResult {
    const extractor = this.config.customExtractors?.[extractorName]
    if (!extractor) {
      throw new Error(`Custom extractor '${extractorName}' not found`)
    }

    const features = { custom: extractor(data) }
    const vector = this.featuresToVector(features)

    const result: FeatureExtractionResult = {
      features,
      vector,
      confidence: 0.8, // Default confidence for custom extractors
      metadata: this.config.includeMetadata
        ? { ...metadata, type: 'custom', extractor: extractorName }
        : {},
    }

    this.recordExtraction('custom', result)
    return result
  }

  /**
   * Compute text-based features
   */
  private computeTextFeatures(text: string): Record<string, number> {
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const chars = text.length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length

    return {
      length: chars,
      wordCount: words.length,
      avgWordLength: words.length > 0 ? chars / words.length : 0,
      sentenceCount: sentences,
      avgSentenceLength: sentences > 0 ? words.length / sentences : 0,
      uniqueWords: new Set(words.map(w => w.toLowerCase())).size / Math.max(words.length, 1),
      uppercaseRatio: (text.match(/[A-Z]/g) || []).length / Math.max(chars, 1),
      digitRatio: (text.match(/\d/g) || []).length / Math.max(chars, 1),
      punctuationRatio: (text.match(/[.,!?;:]/g) || []).length / Math.max(chars, 1),
    }
  }

  /**
   * Compute structured data features
   */
  private computeStructuredFeatures(data: Record<string, unknown>): Record<string, number> {
    const features: Record<string, number> = {
      fieldCount: Object.keys(data).length,
      nullCount: Object.values(data).filter(v => v === null || v === undefined).length,
      stringCount: Object.values(data).filter(v => typeof v === 'string').length,
      numberCount: Object.values(data).filter(v => typeof v === 'number').length,
      booleanCount: Object.values(data).filter(v => typeof v === 'boolean').length,
      arrayCount: Object.values(data).filter(v => Array.isArray(v)).length,
      objectCount: Object.values(data).filter(
        v => typeof v === 'object' && v !== null && !Array.isArray(v)
      ).length,
    }

    // Add nested depth
    features.nestingDepth = this.calculateNestingDepth(data)

    return features
  }

  /**
   * Compute interaction features
   */
  private computeInteractionFeatures(interaction: {
    userMessage: string
    assistantResponse: string
    timestamp: number
    rating?: number
  }): Record<string, number> {
    const userFeatures = this.computeTextFeatures(interaction.userMessage)
    const assistantFeatures = this.computeTextFeatures(interaction.assistantResponse)

    return {
      ...userFeatures,
      responseLength: assistantFeatures.length,
      responseWordCount: assistantFeatures.wordCount,
      responseRatio: assistantFeatures.wordCount / Math.max(userFeatures.wordCount, 1),
      rating: interaction.rating || 0,
      timestamp: interaction.timestamp,
      timeOfDay: new Date(interaction.timestamp).getHours() / 24,
    }
  }

  /**
   * Convert features to vector
   */
  private featuresToVector(features: Record<string, number>): number[] {
    const values = Object.values(features)
    let vector = this.padVector(values, this.config.dimensions)

    if (this.config.normalize) {
      vector = this.normalizeVector(vector)
    }

    return vector
  }

  /**
   * Pad or truncate vector to target dimensions
   */
  private padVector(vector: number[], targetDim: number): number[] {
    if (vector.length >= targetDim) {
      return vector.slice(0, targetDim)
    }

    // Pad with zeros
    const padded = [...vector]
    while (padded.length < targetDim) {
      padded.push(0)
    }
    return padded
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (norm === 0) return vector
    return vector.map(val => val / norm)
  }

  /**
   * Calculate confidence score for features
   */
  private calculateConfidence(features: Record<string, number>): number {
    const values = Object.values(features)
    const nonZero = values.filter(v => v !== 0).length
    const variance = this.calculateVariance(values)

    // Higher confidence for more non-zero features and reasonable variance
    return Math.min(1, (nonZero / values.length) * 0.7 + Math.min(1, variance) * 0.3)
  }

  /**
   * Calculate variance of values
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length
    return variance
  }

  /**
   * Calculate nesting depth of object
   */
  private calculateNestingDepth(obj: unknown, depth = 0): number {
    if (typeof obj !== 'object' || obj === null) return depth
    if (Array.isArray(obj)) {
      return obj.length > 0
        ? Math.max(...obj.map(item => this.calculateNestingDepth(item, depth + 1)))
        : depth
    }
    const values = Object.values(obj)
    return values.length > 0
      ? Math.max(...values.map(v => this.calculateNestingDepth(v, depth + 1)))
      : depth
  }

  /**
   * Record extraction for history tracking
   */
  private recordExtraction(type: string, result: FeatureExtractionResult): void {
    const history = this.featureHistory.get(type) || []
    history.push(result)
    // Keep only last 100 extractions per type
    if (history.length > 100) {
      history.shift()
    }
    this.featureHistory.set(type, history)
  }

  /**
   * Get extraction statistics
   */
  getStatistics(): Record<string, { count: number; avgConfidence: number }> {
    const stats: Record<string, { count: number; avgConfidence: number }> = {}

    for (const [type, history] of this.featureHistory.entries()) {
      const avgConfidence = history.reduce((sum, r) => sum + r.confidence, 0) / history.length
      stats[type] = { count: history.length, avgConfidence }
    }

    return stats
  }

  /**
   * Clear extraction history
   */
  clearHistory(): void {
    this.featureHistory.clear()
  }
}
