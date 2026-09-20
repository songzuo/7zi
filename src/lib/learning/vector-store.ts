/**
 * Vector Store - In-memory vector storage and retrieval
 * Phase 2: Supports cosine, euclidean, and dot product similarity
 */

import type { FeatureVector, VectorSearchResult, VectorStoreConfig, LearningEvent } from './types'

export class VectorStore {
  private config: VectorStoreConfig
  private vectors: Map<string, FeatureVector>
  private events: LearningEvent[]

  constructor(config: Partial<VectorStoreConfig> = {}) {
    this.config = {
      dimensions: 128,
      metric: 'cosine',
      ...config,
    }
    this.vectors = new Map()
    this.events = []
  }

  /**
   * Add a vector to the store
   */
  async addVector(
    id: string,
    vector: number[],
    metadata: Record<string, unknown> = {},
    source: string = 'unknown'
  ): Promise<void> {
    // Validate vector dimensions
    if (vector.length !== this.config.dimensions) {
      throw new Error(
        `Vector dimension mismatch: expected ${this.config.dimensions}, got ${vector.length}`
      )
    }

    const featureVector: FeatureVector = {
      id,
      vector: [...vector], // Clone to prevent mutation
      metadata,
      timestamp: Date.now(),
      source,
    }

    this.vectors.set(id, featureVector)
    this.recordEvent('vector_storage', { id, source }, true)
  }

  /**
   * Add multiple vectors at once
   */
  async addBatch(
    vectors: Array<{
      id: string
      vector: number[]
      metadata?: Record<string, unknown>
      source?: string
    }>
  ): Promise<void> {
    for (const { id, vector, metadata = {}, source = 'batch' } of vectors) {
      await this.addVector(id, vector, metadata, source)
    }
  }

  /**
   * Get a vector by ID
   */
  getVector(id: string): FeatureVector | undefined {
    return this.vectors.get(id)
  }

  /**
   * Remove a vector by ID
   */
  removeVector(id: string): boolean {
    const result = this.vectors.delete(id)
    if (result) {
      this.recordEvent('vector_storage', { id, action: 'remove' }, true)
    }
    return result
  }

  /**
   * Search for similar vectors
   */
  async search(query: number[], topK: number = 10): Promise<VectorSearchResult[]> {
    if (query.length !== this.config.dimensions) {
      throw new Error(
        `Query dimension mismatch: expected ${this.config.dimensions}, got ${query.length}`
      )
    }

    this.recordEvent('retrieval', { topK, totalVectors: this.vectors.size }, true)

    const results: VectorSearchResult[] = []

    for (const [id, featureVector] of this.vectors.entries()) {
      const distance = this.calculateDistance(query, featureVector.vector)
      const score = this.distanceToScore(distance)

      results.push({
        id,
        score,
        metadata: featureVector.metadata,
        distance,
      })
    }

    // Sort by score (descending) and return top K
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  /**
   * Search with filters
   */
  async searchWithFilter(
    query: number[],
    filter: (metadata: Record<string, unknown>) => boolean,
    topK: number = 10
  ): Promise<VectorSearchResult[]> {
    const allResults = await this.search(query, this.vectors.size)
    return allResults.filter(r => filter(r.metadata)).slice(0, topK)
  }

  /**
   * Find nearest neighbors for a specific vector ID
   */
  async findNeighbors(id: string, topK: number = 5): Promise<VectorSearchResult[]> {
    const vector = this.vectors.get(id)
    if (!vector) {
      throw new Error(`Vector with id '${id}' not found`)
    }

    const results = await this.search(vector.vector, topK + 1)
    // Exclude the query vector itself
    return results.filter(r => r.id !== id).slice(0, topK)
  }

  /**
   * Calculate distance between two vectors
   */
  private calculateDistance(a: number[], b: number[]): number {
    switch (this.config.metric) {
      case 'cosine':
        return this.cosineDistance(a, b)
      case 'euclidean':
        return this.euclideanDistance(a, b)
      case 'dot':
        return this.dotProduct(a, b)
      default:
        return this.cosineDistance(a, b)
    }
  }

  /**
   * Cosine distance (1 - cosine similarity)
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
   * Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2
    }
    return Math.sqrt(sum)
  }

  /**
   * Dot product
   */
  private dotProduct(a: number[], b: number[]): number {
    let product = 0
    for (let i = 0; i < a.length; i++) {
      product += a[i] * b[i]
    }
    return product
  }

  /**
   * Convert distance to similarity score
   */
  private distanceToScore(distance: number): number {
    switch (this.config.metric) {
      case 'cosine':
        return 1 - distance // Cosine similarity
      case 'euclidean':
        return 1 / (1 + distance) // Inverse distance
      case 'dot':
        return distance // Already a similarity measure
      default:
        return 1 - distance
    }
  }

  /**
   * Get all vector IDs
   */
  getAllIds(): string[] {
    return Array.from(this.vectors.keys())
  }

  /**
   * Get vectors by source
   */
  getBySource(source: string): FeatureVector[] {
    return Array.from(this.vectors.values()).filter(v => v.source === source)
  }

  /**
   * Get vectors within time range
   */
  getByTimeRange(startTime: number, endTime: number): FeatureVector[] {
    return Array.from(this.vectors.values()).filter(
      v => v.timestamp >= startTime && v.timestamp <= endTime
    )
  }

  /**
   * Get store statistics
   */
  getStatistics(): {
    totalVectors: number
    dimensions: number
    metric: string
    sources: Record<string, number>
    avgTimestamp: number
  } {
    const vectors = Array.from(this.vectors.values())
    const sources: Record<string, number> = {}

    for (const v of vectors) {
      sources[v.source] = (sources[v.source] || 0) + 1
    }

    const avgTimestamp =
      vectors.length > 0 ? vectors.reduce((sum, v) => sum + v.timestamp, 0) / vectors.length : 0

    return {
      totalVectors: this.vectors.size,
      dimensions: this.config.dimensions,
      metric: this.config.metric,
      sources,
      avgTimestamp,
    }
  }

  /**
   * Clear all vectors
   */
  clear(): void {
    this.vectors.clear()
    this.events = []
  }

  /**
   * Export vectors for persistence
   */
  export(): FeatureVector[] {
    return Array.from(this.vectors.values())
  }

  /**
   * Import vectors from exported data
   */
  async import(vectors: FeatureVector[]): Promise<void> {
    for (const v of vectors) {
      await this.addVector(v.id, v.vector, v.metadata, v.source)
    }
  }

  /**
   * Record an event
   */
  private recordEvent(
    type: LearningEvent['type'],
    data: Record<string, unknown>,
    success: boolean,
    error?: string
  ): void {
    this.events.push({
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      data,
      success,
      error,
    })

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }

  /**
   * Get recent events
   */
  getEvents(limit: number = 100): LearningEvent[] {
    return this.events.slice(-limit)
  }

  /**
   * Batch similarity search with multiple queries
   */
  async batchSearch(queries: number[][], topK: number = 10): Promise<VectorSearchResult[][]> {
    const results: VectorSearchResult[][] = []
    for (const query of queries) {
      results.push(await this.search(query, topK))
    }
    return results
  }

  /**
   * Merge with another vector store
   */
  async merge(other: VectorStore): Promise<void> {
    const stats = other.getStatistics()
    if (stats.dimensions !== this.config.dimensions) {
      throw new Error(`Dimension mismatch: cannot merge stores with different dimensions`)
    }

    for (const [id, vector] of other['vectors'].entries()) {
      if (!this.vectors.has(id)) {
        await this.addVector(id, vector.vector, vector.metadata, vector.source)
      }
    }
  }
}
