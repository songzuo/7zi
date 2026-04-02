# Agent Learning System 2.0 - Phase 2

Feature storage and retrieval system for AI agents.

## Overview

Phase 2 implements a complete feature engineering pipeline with vector storage, similarity search, and quality analysis.

## Architecture

### Core Components

1. **FeatureExtractor** - Extracts features from various data sources
   - Text analysis (length, word count, sentence structure)
   - Structured data analysis (field types, nesting depth)
   - Interaction analysis (user/assistant patterns)
   - Custom extractors support

2. **VectorStore** - In-memory vector storage and retrieval
   - Multiple distance metrics (cosine, euclidean, dot product)
   - Batch operations (add, search, import/export)
   - Filtering by metadata, source, time range
   - Event tracking for audit

3. **QualityAnalyzer** - Analyzes and reports on feature quality
   - Metrics: accuracy, precision, recall, F1, coverage, freshness, diversity
   - Issue detection with severity levels
   - Actionable recommendations
   - Trend analysis over time

4. **LearningPipeline** - Integrated convenience wrapper
   - Combines all components
   - Simple API for common operations
   - Statistics aggregation

## Usage

### Basic Usage

```typescript
import { LearningPipeline } from '@/lib/learning'

// Create pipeline
const pipeline = new LearningPipeline()

// Learn from text
await pipeline.learnFromText('doc-1', 'Hello world', { category: 'greeting' })

// Learn from structured data
await pipeline.learnFromStructured('data-1', { name: 'Test', value: 42 })

// Learn from interaction
await pipeline.learnFromInteraction('int-1', {
  userMessage: 'Hello',
  assistantResponse: 'Hi there!',
  timestamp: Date.now(),
  rating: 5,
})

// Search for similar items
const results = await pipeline.searchSimilar('Hello world', 5)

// Analyze quality
const assessment = await pipeline.analyzeQuality()
console.log(assessment.metrics)
console.log(assessment.recommendations)
```

### Advanced Usage

```typescript
import { FeatureExtractor, VectorStore, QualityAnalyzer } from '@/lib/learning'

// Custom configuration
const extractor = new FeatureExtractor({
  dimensions: 256,
  normalize: true,
  customExtractors: {
    myExtractor: data => {
      // Custom extraction logic
      return 0.5
    },
  },
})

const store = new VectorStore({
  dimensions: 256,
  metric: 'cosine',
})

const analyzer = new QualityAnalyzer({
  minAccuracy: 0.8,
  minCoverage: 0.7,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
})

// Extract features
const result = extractor.extractFromText('Sample text')

// Store vector
await store.addVector('id-1', result.vector, result.metadata)

// Search
const similar = await store.search(result.vector, 10)

// Analyze
const quality = await analyzer.analyze(store)
```

## API Reference

### FeatureExtractor

```typescript
class FeatureExtractor {
  constructor(config?: Partial<FeatureExtractorConfig>)

  extractFromText(text: string, metadata?: Record<string, unknown>): FeatureExtractionResult
  extractFromStructured(
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): FeatureExtractionResult
  extractFromInteraction(
    interaction: InteractionData,
    metadata?: Record<string, unknown>
  ): FeatureExtractionResult
  extractCustom(
    data: unknown,
    extractorName: string,
    metadata?: Record<string, unknown>
  ): FeatureExtractionResult

  getStatistics(): Record<string, { count: number; avgConfidence: number }>
  clearHistory(): void
}
```

### VectorStore

```typescript
class VectorStore {
  constructor(config?: Partial<VectorStoreConfig>)

  addVector(
    id: string,
    vector: number[],
    metadata?: Record<string, unknown>,
    source?: string
  ): Promise<void>
  addBatch(vectors: VectorInput[]): Promise<void>
  getVector(id: string): FeatureVector | undefined
  removeVector(id: string): boolean

  search(query: number[], topK?: number): Promise<VectorSearchResult[]>
  searchWithFilter(
    query: number[],
    filter: (metadata: Record<string, unknown>) => boolean,
    topK?: number
  ): Promise<VectorSearchResult[]>
  findNeighbors(id: string, topK?: number): Promise<VectorSearchResult[]>
  batchSearch(queries: number[][], topK?: number): Promise<VectorSearchResult[][]>

  getAllIds(): string[]
  getBySource(source: string): FeatureVector[]
  getByTimeRange(startTime: number, endTime: number): FeatureVector[]

  getStatistics(): StoreStatistics
  getEvents(limit?: number): LearningEvent[]

  export(): FeatureVector[]
  import(vectors: FeatureVector[]): Promise<void>
  merge(other: VectorStore): Promise<void>

  clear(): void
}
```

### QualityAnalyzer

```typescript
class QualityAnalyzer {
  constructor(config?: Partial<QualityAnalyzerConfig>)

  analyze(vectorStore: VectorStore): Promise<QualityAssessment>

  getHistory(): QualityAssessment[]
  getTrend(): TrendAnalysis
  clearHistory(): void

  calculateOverallScore(metrics: QualityMetrics): number
  generateReport(assessment: QualityAssessment): string
}
```

### LearningPipeline

```typescript
class LearningPipeline {
  constructor(config?: LearningPipelineConfig)

  learnFromText(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>
  learnFromStructured(
    id: string,
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<void>
  learnFromInteraction(
    id: string,
    interaction: InteractionData,
    metadata?: Record<string, unknown>
  ): Promise<void>

  searchSimilar(query: string, topK?: number): Promise<VectorSearchResult[]>
  analyzeQuality(): Promise<QualityAssessment>

  getStatistics(): PipelineStatistics
}
```

## Configuration

### FeatureExtractorConfig

```typescript
interface FeatureExtractorConfig {
  dimensions: number // Vector dimensions (default: 128)
  normalize: boolean // Normalize vectors to unit length (default: true)
  includeMetadata: boolean // Include metadata in results (default: true)
  customExtractors?: Record<string, (data: unknown) => number>
}
```

### VectorStoreConfig

```typescript
interface VectorStoreConfig {
  dimensions: number // Vector dimensions (default: 128)
  metric: 'cosine' | 'euclidean' | 'dot' // Distance metric (default: 'cosine')
  maxVectors?: number // Maximum vectors to store
  persistPath?: string // Path for persistence (future)
}
```

### QualityAnalyzerConfig

```typescript
interface QualityAnalyzerConfig {
  minAccuracy: number // Minimum accuracy threshold (default: 0.7)
  minCoverage: number // Minimum coverage threshold (default: 0.5)
  maxAge: number // Maximum age in milliseconds (default: 7 days)
  minDiversity: number // Minimum diversity threshold (default: 0.3)
  sampleSize: number // Sample size for analysis (default: 100)
}
```

## Testing

Run tests:

```bash
npm test -- src/lib/learning/__tests__/
```

Run with coverage:

```bash
npm run test:coverage -- src/lib/learning/__tests__/
```

Current coverage: **97.21%** (exceeds 80% requirement)

## Future Enhancements

- **Phase 3**: Persistent storage (SQLite, Redis)
- **Phase 4**: External vector databases (Pinecone, Milvus)
- **Phase 5**: Incremental learning and model updates
- **Phase 6**: Distributed learning across multiple agents

## License

MIT
