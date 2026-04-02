/**
 * Agent Learning System 2.0 - Type Definitions
 * Phase 2: Feature Storage and Retrieval
 */

/**
 * Feature vector representation
 */
export interface FeatureVector {
  id: string
  vector: number[]
  metadata: Record<string, unknown>
  timestamp: number
  source: string
}

/**
 * Feature extraction result
 */
export interface FeatureExtractionResult {
  features: Record<string, number>
  vector: number[]
  confidence: number
  metadata: Record<string, unknown>
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string
  score: number
  metadata: Record<string, unknown>
  distance: number
}

/**
 * Quality metrics
 */
export interface QualityMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  coverage: number
  freshness: number
  diversity: number
  overall: number
}

/**
 * Quality assessment result
 */
export interface QualityAssessment {
  metrics: QualityMetrics
  issues: QualityIssue[]
  recommendations: string[]
  timestamp: number
}

/**
 * Quality issue
 */
export interface QualityIssue {
  type: 'low_accuracy' | 'low_coverage' | 'stale_data' | 'low_diversity' | 'high_variance'
  severity: 'low' | 'medium' | 'high'
  message: string
  affectedFeatures: string[]
}

/**
 * Feature extractor configuration
 */
export interface FeatureExtractorConfig {
  dimensions: number
  normalize: boolean
  includeMetadata: boolean
  customExtractors?: Record<string, (data: unknown) => number>
}

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
  dimensions: number
  metric: 'cosine' | 'euclidean' | 'dot'
  maxVectors?: number
  persistPath?: string
}

/**
 * Quality analyzer configuration
 */
export interface QualityAnalyzerConfig {
  minAccuracy: number
  minCoverage: number
  maxAge: number // milliseconds
  minDiversity: number
  sampleSize: number
}

/**
 * Learning event
 */
export interface LearningEvent {
  id: string
  type: 'feature_extraction' | 'vector_storage' | 'quality_check' | 'retrieval'
  timestamp: number
  data: Record<string, unknown>
  success: boolean
  error?: string
}

/**
 * Learning statistics
 */
export interface LearningStatistics {
  totalFeatures: number
  totalVectors: number
  avgQuality: number
  retrievalAccuracy: number
  lastUpdate: number
  events: LearningEvent[]
}
