// RAG 系统核心类型定义

export interface Document {
  id: string;
  title: string;
  content: string;
  mimeType?: string;
  source?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  metadata: {
    title: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
    [key: string]: any;
  };
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  metadata: DocumentChunk['metadata'];
}

export interface HybridSearchResult extends VectorSearchResult {
  keywordScore?: number;
  vectorScore?: number;
  combinedScore: number;
}

export interface RetrievalOptions {
  query: string;
  topK?: number;
  minScore?: number;
  rerank?: boolean;
  filters?: Record<string, any>;
}

export interface RAGAnswer {
  answer: string;
  sources: Array<{
    documentId: string;
    title: string;
    content: string;
    score: number;
    url?: string;
  }>;
  chunks: HybridSearchResult[];
  confidence: number;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    retrievalTime?: number;
  };
}

export interface VectorStoreConfig {
  provider: 'weaviate' | 'pinecone' | 'qdrant' | 'local';
  endpoint?: string;
  apiKey?: string;
  collection?: string;
  embeddingModel?: string;
  embeddingDimension?: number;
}

export interface DocumentProcessorConfig {
  maxChunkSize?: number;
  chunkOverlap?: number;
  chunkingStrategy?: 'recursive' | 'semantic' | 'fixed';
  supportedMimeTypes?: string[];
}

export interface RetrievalConfig {
  vectorWeight?: number;
  keywordWeight?: number;
  topK?: number;
  minScore?: number;
  useRerank?: boolean;
  rrfK?: number; // Reciprocal Rank Fusion parameter
}
