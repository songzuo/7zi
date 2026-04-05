/**
 * 知识库 RAG 系统模块
 *
 * 提供完整的文档处理、向量存储、智能检索和问答功能
 */

// 类型定义
export * from './types';

// 文档处理管道
export {
  DocumentProcessor,
  DocumentChunker,
} from './document-pipeline';

// 向量存储
export {
  IVectorStore,
  WeaviateVectorStore,
  LocalVectorStore,
  VectorStoreFactory,
} from './vector-store';

// 智能检索器
export {
  SmartRetriever,
  BM25Searcher,
} from './smart-retriever';

// RAG 问答器
export {
  RAGQA,
  CitationTracer,
  type RAGQAConfig,
} from './rag-qa';

// 便捷的工厂函数
import { DocumentProcessor } from './document-pipeline';
import { VectorStoreFactory } from './vector-store';
import { SmartRetriever } from './smart-retriever';
import { RAGQA } from './rag-qa';
import type { VectorStoreConfig, RetrievalConfig, RAGQAConfig } from './types';

/**
 * 创建完整的 RAG 系统
 */
export function createRAGSystem(
  vectorStoreConfig: VectorStoreConfig,
  retrievalConfig?: RetrievalConfig,
  qaConfig?: RAGQAConfig
) {
  const vectorStore = VectorStoreFactory.create(vectorStoreConfig);
  const retriever = new SmartRetriever(vectorStore, retrievalConfig);
  const qa = new RAGQA(retriever, qaConfig);

  return {
    vectorStore,
    retriever,
    qa,
    documentProcessor: new DocumentProcessor(),
  };
}

/**
 * 快速问答函数
 */
export async function quickAsk(
  question: string,
  vectorStoreConfig: VectorStoreConfig,
  options?: {
    retrieval?: Partial<RetrievalConfig>;
    qa?: Partial<RAGQAConfig>;
  }
) {
  const { qa } = createRAGSystem(
    vectorStoreConfig,
    options?.retrieval,
    options?.qa
  );

  return qa.ask(question);
}