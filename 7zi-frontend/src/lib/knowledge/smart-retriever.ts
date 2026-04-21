/**
 * 智能检索器 - 混合检索 + RRF 排序 + 重排序
 */

import {
  DocumentChunk,
  HybridSearchResult,
  RetrievalOptions,
  RetrievalConfig,
  VectorSearchResult,
} from './types';
import { IVectorStore } from './vector-store';

export class SmartRetriever {
  private vectorStore: IVectorStore;
  private config: Required<RetrievalConfig>;

  constructor(vectorStore: IVectorStore, config: RetrievalConfig = {}) {
    this.vectorStore = vectorStore;
    this.config = {
      vectorWeight: config.vectorWeight ?? 0.7,
      keywordWeight: config.keywordWeight ?? 0.3,
      topK: config.topK ?? 10,
      minScore: config.minScore ?? 0.1,
      useRerank: config.useRerank ?? false,
      rrfK: config.rrfK ?? 60,
    };
  }

  /**
   * 智能检索 - 混合向量和关键词搜索
   */
  async retrieve(options: RetrievalOptions): Promise<HybridSearchResult[]> {
    const { query, topK = this.config.topK, filters, rerank = this.config.useRerank } = options;

    // 生成查询嵌入
    const queryEmbedding = await this.generateQueryEmbedding(query);

    // 并行执行向量搜索和关键词搜索
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(queryEmbedding, topK * 2, filters),
      this.keywordSearch(query, topK * 2, filters),
    ]);

    // RRF 融合结果
    const rrfResults = this.reciprocalRankFusion(vectorResults, keywordResults);

    // 应用最小分数阈值
    const filteredResults = rrfResults.filter((r) => r.combinedScore >= this.config.minScore);

    // 如果启用重排序
    if (rerank && filteredResults.length > 0) {
      return await this.rerankResults(query, filteredResults);
    }

    return filteredResults.slice(0, topK);
  }

  /**
   * 向量搜索
   */
  private async vectorSearch(
    embedding: number[],
    topK: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    return this.vectorStore.search(embedding, topK, filters);
  }

  /**
   * 关键词搜索（BM25）
   * 实际实现需要使用搜索引擎库如 FlexSearch 或 MiniSearch
   */
  private async keywordSearch(
    query: string,
    topK: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    // 简化实现：使用简单的文本匹配
    // 实际环境中应该使用 BM25 算法
    const queryTerms = query.toLowerCase().split(/\s+/);

    const allChunks = await this.getAllChunks(filters);
    const results: VectorSearchResult[] = [];

    for (const chunk of allChunks) {
      const content = chunk.content.toLowerCase();
      let matchCount = 0;
      const positions: number[] = [];

      for (const term of queryTerms) {
        const regex = new RegExp(term, 'gi');
        const matches = content.match(regex);
        if (matches) {
          matchCount += matches.length;
          let match;
          while ((match = regex.exec(content)) !== null) {
            positions.push(match.index);
          }
        }
      }

      if (matchCount > 0) {
        // 计算位置分数（位置越靠前分数越高）
        const positionScore = positions.length > 0
          ? 1 - (Math.min(...positions) / content.length)
          : 0;

        // TF-IDF 风格的简单评分
        const tfScore = matchCount / content.split(/\s+/).length;
        const score = tfScore * 0.7 + positionScore * 0.3;

        results.push({
          chunkId: chunk.id,
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

  /**
   * 互惠排名融合 (Reciprocal Rank Fusion)
   */
  private reciprocalRankFusion(
    vectorResults: VectorSearchResult[],
    keywordResults: VectorSearchResult[]
  ): HybridSearchResult[] {
    const scoreMap = new Map<string, HybridSearchResult>();

    // 处理向量搜索结果
    for (let i = 0; i < vectorResults.length; i++) {
      const result = vectorResults[i];
      const rrfScore = 1 / (this.config.rrfK + i + 1);
      const weightedScore = rrfScore * this.config.vectorWeight;

      const existing = scoreMap.get(result.chunkId);
      if (existing) {
        existing.vectorScore = result.score;
        existing.combinedScore += weightedScore;
      } else {
        scoreMap.set(result.chunkId, {
          ...result,
          vectorScore: result.score,
          keywordScore: 0,
          combinedScore: weightedScore,
        });
      }
    }

    // 处理关键词搜索结果
    for (let i = 0; i < keywordResults.length; i++) {
      const result = keywordResults[i];
      const rrfScore = 1 / (this.config.rrfK + i + 1);
      const weightedScore = rrfScore * this.config.keywordWeight;

      const existing = scoreMap.get(result.chunkId);
      if (existing) {
        existing.keywordScore = result.score;
        existing.combinedScore += weightedScore;
      } else {
        scoreMap.set(result.chunkId, {
          ...result,
          vectorScore: 0,
          keywordScore: result.score,
          combinedScore: weightedScore,
        });
      }
    }

    // 转换为数组并排序
    return Array.from(scoreMap.values()).sort((a, b) => b.combinedScore - a.combinedScore);
  }

  /**
   * 重排序结果
   * 使用更复杂的模型对结果进行重新排序
   */
  private async rerankResults(
    query: string,
    results: HybridSearchResult[]
  ): Promise<HybridSearchResult[]> {
    // 简化实现：基于查询和文档的语义相似度重新排序
    // 实际环境中应该使用专门的 rerank 模型如 Cohere Rerank

    const reranked: HybridSearchResult[] = [];

    for (const result of results) {
      // 计算更多维度的相似度
      const queryTerms = query.toLowerCase().split(/\s+/);
      const contentTerms = result.content.toLowerCase().split(/\s+/);

      // 1. 精确匹配分数
      const exactMatches = queryTerms.filter((term) =>
        contentTerms.includes(term)
      ).length;
      const exactScore = exactMatches / queryTerms.length;

      // 2. 长度惩罚（偏好适中的内容）
      const lengthPenalty = this.lengthPenalty(result.content.length);

      // 3. 位置分数（内容开头的关键词更相关）
      const positionScore = this.positionScore(query, result.content);

      // 综合重排分数
      const rerankScore =
        result.combinedScore * 0.5 +
        exactScore * 0.2 +
        lengthPenalty * 0.1 +
        positionScore * 0.2;

      reranked.push({
        ...result,
        score: rerankScore,
        combinedScore: rerankScore,
      });
    }

    return reranked.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  /**
   * 生成查询嵌入
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    // 实际实现应该调用嵌入 API
    // 这里返回模拟向量
    const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
    // 归一化
    const norm = Math.sqrt(mockEmbedding.reduce((sum, v) => sum + v * v, 0));
    return mockEmbedding.map((v) => v / norm);
  }

  /**
   * 获取所有文档块（用于关键词搜索）
   */
  private async getAllChunks(filters?: Record<string, any>): Promise<DocumentChunk[]> {
    // 简化实现：返回空数组
    // 实际实现需要维护完整的文档块索引
    return [];
  }

  /**
   * 长度惩罚函数
   */
  private lengthPenalty(length: number): number {
    // 偏好 200-1000 字符的内容
    if (length < 200) return 0.5;
    if (length > 2000) return 0.5;
    if (length >= 200 && length <= 1000) return 1.0;
    // 线性衰减
    return 1 - (length - 1000) / 1000;
  }

  /**
   * 位置分数 - 查询词在内容中出现的位置越靠前分数越高
   */
  private positionScore(query: string, content: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    const firstMatchIndex = contentLower.indexOf(queryLower);
    if (firstMatchIndex === -1) {
      // 尝试查找单个词
      const queryTerms = queryLower.split(/\s+/);
      let earliestPosition = contentLower.length;

      for (const term of queryTerms) {
        const idx = contentLower.indexOf(term);
        if (idx !== -1 && idx < earliestPosition) {
          earliestPosition = idx;
        }
      }

      if (earliestPosition === contentLower.length) return 0;
      return 1 - earliestPosition / contentLower.length;
    }

    return 1 - firstMatchIndex / contentLower.length;
  }
}

/**
 * BM25 关键词搜索器（可选的独立实现）
 */
export class BM25Searcher {
  private documents: Map<string, DocumentChunk> = new Map();
  private idf: Map<string, number> = new Map();
  private avgDocLength: number = 0;
  private k1: number = 1.5;
  private b: number = 0.75;

  /**
   * 构建索引
   */
  buildIndex(chunks: DocumentChunk[]): void {
    // 清空现有索引
    this.documents.clear();
    this.idf.clear();

    const docLengths: number[] = [];

    // 添加文档
    for (const chunk of chunks) {
      this.documents.set(chunk.id, chunk);
      docLengths.push(chunk.content.split(/\s+/).length);
    }

    // 计算平均文档长度
    this.avgDocLength = docLengths.reduce((a, b) => a + b, 0) / docLengths.length;

    // 计算 IDF
    const termDocFreq = new Map<string, number>();
    for (const chunk of chunks) {
      const terms = new Set(chunk.content.toLowerCase().split(/\s+/));
      for (const term of terms) {
        termDocFreq.set(term, (termDocFreq.get(term) || 0) + 1);
      }
    }

    const N = chunks.length;
    for (const [term, df] of termDocFreq) {
      this.idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
    }
  }

  /**
   * 搜索
   */
  search(query: string, topK: number = 10): VectorSearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const scores: Map<string, number> = new Map();

    for (const [docId, chunk] of this.documents) {
      const docTerms = chunk.content.toLowerCase().split(/\s+/);
      const docLength = docTerms.length;
      const tf = new Map<string, number>();

      // 计算词频
      for (const term of docTerms) {
        tf.set(term, (tf.get(term) || 0) + 1);
      }

      // 计算 BM25 分数
      let score = 0;
      for (const term of queryTerms) {
        const idf = this.idf.get(term) || 0;
        const termFreq = tf.get(term) || 0;

        const numerator = termFreq * (this.k1 + 1);
        const denominator = termFreq + this.k1 * (1 - this.b + (this.b * docLength / this.avgDocLength));
        score += idf * (numerator / denominator);
      }

      if (score > 0) {
        scores.set(docId, score);
      }
    }

    // 排序并返回 topK
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK);

    return sorted.map(([docId, score]) => {
      const chunk = this.documents.get(docId)!;
      return {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content,
        score,
        metadata: chunk.metadata,
      };
    });
  }
}
