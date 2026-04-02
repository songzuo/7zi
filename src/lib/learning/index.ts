/**
 * Agent Learning System 2.0 - Main Export
 * Phase 2: Feature Storage and Retrieval
 */

// Types
export type {
  FeatureVector,
  FeatureExtractionResult,
  VectorSearchResult,
  QualityMetrics,
  QualityAssessment,
  QualityIssue,
  FeatureExtractorConfig,
  VectorStoreConfig,
  QualityAnalyzerConfig,
  LearningEvent,
  LearningStatistics,
} from './types'

// Core Classes
export { FeatureExtractor } from './feature-extractor'
export { VectorStore } from './vector-store'
export { QualityAnalyzer } from './quality-analyzer'

/**
 * Convenience function to create a complete learning pipeline
 */
import { FeatureExtractor } from './feature-extractor'
import { VectorStore } from './vector-store'
import { QualityAnalyzer } from './quality-analyzer'
import type { FeatureExtractorConfig, VectorStoreConfig, QualityAnalyzerConfig } from './types'

export interface LearningPipelineConfig {
  featureExtractor?: Partial<FeatureExtractorConfig>
  vectorStore?: Partial<VectorStoreConfig>
  qualityAnalyzer?: Partial<QualityAnalyzerConfig>
}

export class LearningPipeline {
  public featureExtractor: FeatureExtractor
  public vectorStore: VectorStore
  public qualityAnalyzer: QualityAnalyzer

  constructor(config: LearningPipelineConfig = {}) {
    this.featureExtractor = new FeatureExtractor(config.featureExtractor)
    this.vectorStore = new VectorStore(config.vectorStore)
    this.qualityAnalyzer = new QualityAnalyzer(config.qualityAnalyzer)
  }

  /**
   * Extract and store features from text
   */
  async learnFromText(
    id: string,
    text: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const result = this.featureExtractor.extractFromText(text, metadata)
    await this.vectorStore.addVector(id, result.vector, result.metadata)
  }

  /**
   * Extract and store features from structured data
   */
  async learnFromStructured(
    id: string,
    data: Record<string, unknown>,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const result = this.featureExtractor.extractFromStructured(data, metadata)
    await this.vectorStore.addVector(id, result.vector, result.metadata)
  }

  /**
   * Extract and store features from interaction
   */
  async learnFromInteraction(
    id: string,
    interaction: {
      userMessage: string
      assistantResponse: string
      timestamp: number
      rating?: number
    },
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const result = this.featureExtractor.extractFromInteraction(interaction, metadata)
    await this.vectorStore.addVector(id, result.vector, result.metadata)
  }

  /**
   * Search for similar experiences
   */
  async searchSimilar(
    query: string,
    topK: number = 5
  ): Promise<import('./types').VectorSearchResult[]> {
    const result = this.featureExtractor.extractFromText(query)
    return this.vectorStore.search(result.vector, topK)
  }

  /**
   * Analyze quality of learned features
   */
  async analyzeQuality(): Promise<import('./types').QualityAssessment> {
    return this.qualityAnalyzer.analyze(this.vectorStore)
  }

  /**
   * Get pipeline statistics
   */
  getStatistics() {
    return {
      featureExtractor: this.featureExtractor.getStatistics(),
      vectorStore: this.vectorStore.getStatistics(),
      quality: this.qualityAnalyzer.getTrend(),
    }
  }
}

/**
 * Default pipeline instance
 */
let defaultPipeline: LearningPipeline | null = null

export function getDefaultPipeline(): LearningPipeline {
  if (!defaultPipeline) {
    defaultPipeline = new LearningPipeline()
  }
  return defaultPipeline
}

export function resetDefaultPipeline(): void {
  defaultPipeline = null
}
