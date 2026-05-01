/**
 * 向量存储适配器 - 抽象接口和 Weaviate 实现
 */

import {
  DocumentChunk,
  VectorStoreConfig,
  VectorSearchResult,
} from './types';
import { logger } from '@/lib/logger';

/**
 * 向量存储抽象接口
 */
export interface IVectorStore {
  /**
   * 初始化向量存储
   */
  initialize(): Promise<void>;

  /**
   * 添加文档块
   */
  addChunks(chunks: DocumentChunk[]): Promise<void>;

  /**
   * 删除文档的所有块
   */
  deleteDocument(documentId: string): Promise<void>;

  /**
   * 向量相似度搜索
   */
  search(
    queryEmbedding: number[],
    topK: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]>;

  /**
   * 批量搜索
   */
  batchSearch(
    queryEmbeddings: number[][],
    topK: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[][]>;

  /**
   * 获取文档块
   */
  getChunk(chunkId: string): Promise<DocumentChunk | null>;

  /**
   * 获取文档的所有块
   */
  getDocumentChunks(documentId: string): Promise<DocumentChunk[]>;

  /**
   * 删除集合
   */
  dropCollection(): Promise<void>;
}

/**
 * Weaviate 向量存储实现
 */
export class WeaviateVectorStore implements IVectorStore {
  private config: VectorStoreConfig;
  private initialized: boolean = false;
  private client: any = null;

  constructor(config: VectorStoreConfig) {
    this.config = {
      provider: 'weaviate',
      endpoint: config.endpoint || 'http://localhost:8080',
      apiKey: config.apiKey,
      collection: config.collection || 'Documents',
      embeddingModel: config.embeddingModel || 'text-embedding-3-small',
      embeddingDimension: config.embeddingDimension || 1536,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 在实际环境中，这里应该导入 weaviate-client
      // const weaviate = require('weaviate-client');
      // this.client = await weaviate.client({
      //   scheme: this.config.endpoint?.startsWith('https') ? 'https' : 'http',
      //   host: new URL(this.config.endpoint!).hostname,
      //   port: parseInt(new URL(this.config.endpoint!).port) || 8080,
      //   apiKey: this.config.apiKey ? new weaviate.ApiKey(this.config.apiKey) : undefined,
      // });

      logger.debug('Weaviate vector store initialized:', this.config);
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize Weaviate:', error);
      throw new Error('Weaviate initialization failed');
    }
  }

  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    if (!this.initialized) await this.initialize();

    if (chunks.length === 0) return;

    try {
      // 批量导入数据
      const batchSize = 100;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        const objects = batch.map((chunk) => ({
          id: chunk.id,
          properties: {
            documentId: chunk.documentId,
            content: chunk.content,
            ...chunk.metadata,
          },
          vector: chunk.embedding,
        }));

        // 实际代码：
        // await this.client.data
        //   .creator()
        //   .withClassName(this.config.collection)
        //   .withObjects(objects)
        //   .do();

        logger.debug(`Added ${objects.length} chunks to Weaviate`);
      }
    } catch (error) {
      logger.error('Failed to add chunks:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      // 实际代码：
      // await this.client.data
      //   .deleter()
      //   .withClassName(this.config.collection)
      //   .withWhere({
      //     path: ['documentId'],
      //     operator: 'Equal',
      //     valueString: documentId,
      //   })
      //   .do();

      logger.debug(`Deleted document ${documentId} from Weaviate`);
    } catch (error) {
      logger.error('Failed to delete document:', error);
      throw error;
    }
  }

  async search(
    queryEmbedding: number[],
    topK: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    if (!this.initialized) await this.initialize();

    try {
      const where = filters ? this.buildWhereFilter(filters) : undefined;

      // 实际代码：
      // const result = await this.client.graphql
      //   .get()
      //   .withClassName(this.config.collection)
      //   .withNearVector({ vector: queryEmbedding })
      //   .withLimit(topK)
      //   .withWhere(where)
      //   .withFields(['id', 'documentId', 'content', 'metadata', '_additional { distance }'])
      //   .do();

      // 模拟返回结果
      const mockResults: VectorSearchResult[] = [];
      for (let i = 0; i < Math.min(topK, 5); i++) {
        mockResults.push({
          chunkId: `chunk_mock_${i}`,
          documentId: `doc_mock`,
          content: `Mock content ${i}`,
          score: 0.9 - i * 0.1,
          metadata: {
            title: 'Mock Document',
            chunkIndex: i,
            startChar: i * 100,
            endChar: (i + 1) * 100,
          },
        });
      }

      return mockResults;
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  async batchSearch(
    queryEmbeddings: number[][],
    topK: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[][]> {
    const results: VectorSearchResult[][] = [];

    for (const embedding of queryEmbeddings) {
      const result = await this.search(embedding, topK, filters);
      results.push(result);
    }

    return results;
  }

  async getChunk(chunkId: string): Promise<DocumentChunk | null> {
    if (!this.initialized) await this.initialize();

    try {
      // 实际代码：
      // const result = await this.client.data
      //   .getterById()
      //   .withClassName(this.config.collection)
      //   .withId(chunkId)
      //   .do();

      // if (!result) return null;

      // return {
      //   id: result.id,
      //   documentId: result.properties.documentId,
      //   content: result.properties.content,
      //   embedding: result.vector,
      //   metadata: result.properties,
      // };

      // 模拟返回
      return null;
    } catch (error) {
      logger.error('Failed to get chunk:', error);
      return null;
    }
  }

  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    if (!this.initialized) await this.initialize();

    try {
      // 实际代码：
      // const result = await this.client.graphql
      //   .get()
      //   .withClassName(this.config.collection)
      //   .withWhere({
      //     path: ['documentId'],
      //     operator: 'Equal',
      //     valueString: documentId,
      //   })
      //   .do();

      // return result.data.Get[this.config.collection].map((item: any) => ({
      //   id: item.id,
      //   documentId: item.documentId,
      //   content: item.content,
      //   metadata: item,
      // }));

      // 模拟返回
      return [];
    } catch (error) {
      logger.error('Failed to get document chunks:', error);
      return [];
    }
  }

  async dropCollection(): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      // 实际代码：
      // await this.client.schema
      //   .classDeleter()
      //   .withClassName(this.config.collection)
      //   .do();

      logger.debug(`Dropped collection ${this.config.collection}`);
    } catch (error) {
      logger.error('Failed to drop collection:', error);
      throw error;
    }
  }

  private buildWhereFilter(filters: Record<string, any>): any {
    const operators: Record<string, string> = {
      eq: 'Equal',
      ne: 'NotEqual',
      gt: 'GreaterThan',
      gte: 'GreaterThanOrEqual',
      lt: 'LessThan',
      lte: 'LessThanOrEqual',
      contains: 'Contains',
      in: 'In',
    };

    // 简单的过滤器构建
    const conditions: any[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'object' && value.op && value.value) {
        conditions.push({
          path: [key],
          operator: operators[value.op] || 'Equal',
          [typeof value.value === 'number' ? 'valueNumber' : 'valueString']: value.value,
        });
      } else {
        conditions.push({
          path: [key],
          operator: 'Equal',
          [typeof value === 'number' ? 'valueNumber' : 'valueString']: value,
        });
      }
    }

    return conditions.length === 1 ? conditions[0] : { operator: 'And', operands: conditions };
  }
}

/**
 * 本地向量存储实现（用于开发和测试）
 */
export class LocalVectorStore implements IVectorStore {
  private chunks: Map<string, DocumentChunk> = new Map();
  private documentIndex: Map<string, Set<string>> = new Map();

  async initialize(): Promise<void> {
    logger.debug('Local vector store initialized');
  }

  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);

      if (!this.documentIndex.has(chunk.documentId)) {
        this.documentIndex.set(chunk.documentId, new Set());
      }
      this.documentIndex.get(chunk.documentId)!.add(chunk.id);
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    const chunkIds = this.documentIndex.get(documentId);
    if (chunkIds) {
      for (const chunkId of chunkIds) {
        this.chunks.delete(chunkId);
      }
      this.documentIndex.delete(documentId);
    }
  }

  async search(
    queryEmbedding: number[],
    topK: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    for (const [id, chunk] of this.chunks) {
      // 应用过滤器
      if (filters) {
        let matches = true;
        for (const [key, value] of Object.entries(filters)) {
          if (chunk.metadata[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      // 计算余弦相似度
      if (chunk.embedding && queryEmbedding) {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        results.push({
          chunkId: id,
          documentId: chunk.documentId,
          content: chunk.content,
          score,
          metadata: chunk.metadata,
        });
      }
    }

    // 按分数排序并返回 topK
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async batchSearch(
    queryEmbeddings: number[][],
    topK: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[][]> {
    const results: VectorSearchResult[][] = [];

    for (const embedding of queryEmbeddings) {
      results.push(await this.search(embedding, topK, filters));
    }

    return results;
  }

  async getChunk(chunkId: string): Promise<DocumentChunk | null> {
    return this.chunks.get(chunkId) || null;
  }

  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    const chunkIds = this.documentIndex.get(documentId);
    if (!chunkIds) return [];

    const chunks: DocumentChunk[] = [];
    for (const chunkId of chunkIds) {
      const chunk = this.chunks.get(chunkId);
      if (chunk) chunks.push(chunk);
    }
    return chunks;
  }

  async dropCollection(): Promise<void> {
    this.chunks.clear();
    this.documentIndex.clear();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * 向量存储工厂
 */
export class VectorStoreFactory {
  static create(config: VectorStoreConfig): IVectorStore {
    switch (config.provider) {
      case 'weaviate':
        return new WeaviateVectorStore(config);
      case 'local':
        return new LocalVectorStore();
      default:
        throw new Error(`Unsupported vector store provider: ${config.provider}`);
    }
  }
}
