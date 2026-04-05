/**
 * 知识库 RAG 系统使用示例
 */

import {
  createRAGSystem,
  DocumentProcessor,
  VectorStoreFactory,
  SmartRetriever,
  RAGQA,
  type VectorStoreConfig,
  type RetrievalConfig,
  type RAGQAConfig,
} from './index';

// ==================== 示例 1: 基本使用 ====================

async function basicExample() {
  console.log('=== 基本使用示例 ===\n');

  // 1. 创建 RAG 系统
  const vectorStoreConfig: VectorStoreConfig = {
    provider: 'local', // 开发环境使用本地存储
    // 生产环境使用 Weaviate:
    // provider: 'weaviate',
    // endpoint: 'https://your-weaviate-instance.com',
    // apiKey: 'your-api-key',
  };

  const { vectorStore, retriever, qa, documentProcessor } = createRAGSystem(
    vectorStoreConfig,
    {
      topK: 5,
      vectorWeight: 0.7,
      keywordWeight: 0.3,
      useRerank: true,
    },
    {
      model: 'gpt-4',
      temperature: 0.7,
      includeCitations: true,
    }
  );

  // 2. 初始化向量存储
  await vectorStore.initialize();

  // 3. 处理文档
  const document = await documentProcessor.parseDocument(
    new File(['这是文档内容...'], 'document.txt'),
    'text/plain',
    { title: '示例文档', source: 'user-upload' }
  );

  console.log(`解析文档: ${document.title}`);
  console.log(`内容长度: ${document.content.length} 字符\n`);

  // 4. 分块
  const chunks = await documentProcessor.chunkDocument(document);
  console.log(`生成 ${chunks.length} 个文档块\n`);

  // 5. 生成嵌入
  const chunksWithEmbeddings = await documentProcessor.generateEmbeddings(chunks);
  console.log(`生成 ${chunksWithEmbeddings.length} 个嵌入向量\n`);

  // 6. 添加到向量存储
  await vectorStore.addChunks(chunksWithEmbeddings);
  console.log('文档块已添加到向量存储\n');

  // 7. 问答
  const answer = await qa.ask('这个文档讲了什么？');
  console.log('=== 答案 ===');
  console.log(answer.answer);
  console.log(`\n置信度: ${(answer.confidence * 100).toFixed(1)}%`);
  console.log(`来源数量: ${answer.sources.length}\n`);

  // 8. 显示来源
  console.log('=== 来源 ===');
  for (let i = 0; i < answer.sources.length; i++) {
    const source = answer.sources[i];
    console.log(`${i + 1}. ${source.title}`);
    console.log(`   相关性: ${(source.score * 100).toFixed(1)}%`);
    console.log(`   内容: ${source.content.substring(0, 100)}...\n`);
  }
}

// ==================== 示例 2: 批量处理文档 ====================

async function batchProcessingExample() {
  console.log('=== 批量处理示例 ===\n');

  const documentProcessor = new DocumentProcessor({
    maxChunkSize: 800,
    chunkOverlap: 150,
    chunkingStrategy: 'recursive',
  });

  const vectorStore = VectorStoreFactory.create({
    provider: 'local',
  });

  await vectorStore.initialize();

  // 模拟多个文档
  const documents = [
    { content: '文档1的内容...', title: '文档1', mimeType: 'text/plain' },
    { content: '文档2的内容...', title: '文档2', mimeType: 'text/plain' },
    { content: '文档3的内容...', title: '文档3', mimeType: 'text/plain' },
  ];

  let totalChunks = 0;

  for (const doc of documents) {
    // 解析文档
    const document = await documentProcessor.parseDocument(
      new File([doc.content], `${doc.title}.txt`),
      doc.mimeType,
      { title: doc.title }
    );

    // 分块
    const chunks = await documentProcessor.chunkDocument(document);
    totalChunks += chunks.length;

    // 生成嵌入
    const chunksWithEmbeddings = await documentProcessor.generateEmbeddings(chunks);

    // 添加到向量存储
    await vectorStore.addChunks(chunksWithEmbeddings);

    console.log(`处理完成: ${doc.title} (${chunks.length} 个块)`);
  }

  console.log(`\n总计: ${totalChunks} 个文档块\n`);
}

// ==================== 示例 3: 高级检索配置 ====================

async function advancedRetrievalExample() {
  console.log('=== 高级检索示例 ===\n');

  const vectorStore = VectorStoreFactory.create({ provider: 'local' });
  await vectorStore.initialize();

  // 自定义检索配置
  const retrievalConfig: RetrievalConfig = {
    topK: 10,
    minScore: 0.2,
    vectorWeight: 0.6,
    keywordWeight: 0.4,
    useRerank: true,
    rrfK: 50,
  };

  const retriever = new SmartRetriever(vectorStore, retrievalConfig);

  // 带过滤器的检索
  const results = await retriever.retrieve({
    query: '搜索关键词',
    topK: 5,
    filters: {
      // 只搜索特定文档
      documentId: 'doc_123',
      // 或其他元数据过滤
      // category: 'technical',
    },
    rerank: true,
  });

  console.log(`检索到 ${results.length} 个结果\n`);

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    console.log(`${i + 1}. ${result.metadata.title}`);
    console.log(`   向量分数: ${result.vectorScore?.toFixed(3)}`);
    console.log(`   关键词分数: ${result.keywordScore?.toFixed(3)}`);
    console.log(`   综合分数: ${result.combinedScore.toFixed(3)}\n`);
  }
}

// ==================== 示例 4: 流式问答 ====================

async function streamingQAExample() {
  console.log('=== 流式问答示例 ===\n');

  const vectorStore = VectorStoreFactory.create({ provider: 'local' });
  await vectorStore.initialize();

  const retriever = new SmartRetriever(vectorStore);
  const qa = new RAGQA(retriever, {
    model: 'gpt-4',
    temperature: 0.7,
  });

  console.log('问题: 请解释这个概念\n');
  console.log('答案: ');

  // 流式输出
  for await (const chunk of qa.askStream('请解释这个概念')) {
    process.stdout.write(chunk);
  }

  console.log('\n');
}

// ==================== 示例 5: 引用追溯 ====================

async function citationExample() {
  console.log('=== 引用追溯示例 ===\n');

  const vectorStore = VectorStoreFactory.create({ provider: 'local' });
  await vectorStore.initialize();

  const retriever = new SmartRetriever(vectorStore);
  const qa = new RAGQA(retriever);

  const answer = await qa.ask('某个问题');

  // 使用引用追溯器
  const { CitationTracer } = await import('./rag-qa');
  const tracer = new CitationTracer();

  // 提取引用的文档
  const citedIds = tracer.extractCitations(answer.answer, answer.sources);
  console.log(`引用的文档: ${citedIds.join(', ')}\n`);

  // 追溯具体段落
  const tracedChunks = tracer.traceSourceChunks(answer.answer, answer.chunks);
  console.log('引用的具体段落:');
  for (const { chunk, matchedText } of tracedChunks) {
    console.log(`- ${chunk.metadata.title}`);
    console.log(`  "${matchedText}"\n`);
  }

  // 生成引用报告
  const report = tracer.generateCitationReport(answer);
  console.log(report);
}

// ==================== 示例 6: Weaviate 生产环境配置 ====================

async function productionExample() {
  console.log('=== 生产环境配置示例 ===\n');

  const vectorStoreConfig: VectorStoreConfig = {
    provider: 'weaviate',
    endpoint: process.env.WEAVIATE_ENDPOINT || 'https://weaviate.example.com',
    apiKey: process.env.WEAVIATE_API_KEY,
    collection: 'KnowledgeBase',
    embeddingModel: 'text-embedding-3-small',
    embeddingDimension: 1536,
  };

  const { vectorStore, retriever, qa } = createRAGSystem(
    vectorStoreConfig,
    {
      topK: 10,
      vectorWeight: 0.7,
      keywordWeight: 0.3,
      useRerank: true,
    },
    {
      model: 'gpt-4-turbo-preview',
      temperature: 0.5,
      maxTokens: 2000,
      includeCitations: true,
      maxSourceChunks: 5,
    }
  );

  // 初始化
  await vectorStore.initialize();

  // 使用方式与本地存储相同
  const answer = await qa.ask('用户问题');
  console.log(answer.answer);
}

// ==================== 运行示例 ====================

// 取消注释以运行示例
// basicExample().catch(console.error);
// batchProcessingExample().catch(console.error);
// advancedRetrievalExample().catch(console.error);
// streamingQAExample().catch(console.error);
// citationExample().catch(console.error);
// productionExample().catch(console.error);

export {
  basicExample,
  batchProcessingExample,
  advancedRetrievalExample,
  streamingQAExample,
  citationExample,
  productionExample,
};