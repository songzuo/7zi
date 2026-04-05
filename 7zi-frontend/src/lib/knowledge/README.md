# 知识库 RAG 系统

一个完整的检索增强生成 (RAG) 系统，用于基于知识库的智能问答。

## 功能特性

### 1. 文档处理管道
- ✅ 支持多种文档格式：PDF、Word、Markdown、HTML、TXT
- ✅ 递归分块策略，智能分割长文档
- ✅ 批处理嵌入生成，优化性能
- ✅ 可配置的分块大小和重叠

### 2. 向量存储
- ✅ 抽象接口，支持多种向量数据库
- ✅ Weaviate 实现（生产环境推荐）
- ✅ 本地向量存储（开发/测试）
- ✅ 批量搜索和元数据过滤

### 3. 智能检索
- ✅ 混合检索（向量 + 关键词）
- ✅ RRF (Reciprocal Rank Fusion) 排序算法
- ✅ 重排序支持，提升结果质量
- ✅ BM25 关键词搜索（可选）

### 4. RAG 问答
- ✅ 基于检索结果的答案生成
- ✅ 引用追溯，显示来源文档
- ✅ 流式问答支持
- ✅ 置信度评估

## 快速开始

### 安装依赖

```bash
# 基础依赖
npm install

# 生产环境需要
npm install weaviate-client
npm install pdf-parse mammoth

# 可选：更好的文本搜索
npm install flexsearch
```

### 基本使用

```typescript
import { createRAGSystem } from '@/lib/knowledge';

// 1. 创建 RAG 系统
const { qa, documentProcessor, vectorStore } = createRAGSystem({
  provider: 'local', // 或 'weaviate' 用于生产环境
});

// 2. 初始化
await vectorStore.initialize();

// 3. 处理文档
const doc = await documentProcessor.parseDocument(
  file,
  mimeType,
  { title: '文档标题' }
);

// 4. 添加到知识库
const chunks = await documentProcessor.chunkDocument(doc);
const chunksWithEmbeddings = await documentProcessor.generateEmbeddings(chunks);
await vectorStore.addChunks(chunksWithEmbeddings);

// 5. 问答
const answer = await qa.ask('你的问题');
console.log(answer.answer);
console.log(answer.sources); // 引用的文档
```

## 配置选项

### 文档处理配置

```typescript
const documentProcessor = new DocumentProcessor({
  maxChunkSize: 1000,      // 最大分块大小（字符数）
  chunkOverlap: 200,      // 分块重叠大小
  chunkingStrategy: 'recursive', // 'recursive' | 'semantic' | 'fixed'
  supportedMimeTypes: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    // ...
  ],
});
```

### 向量存储配置

```typescript
const vectorStoreConfig = {
  // Weaviate（生产环境）
  provider: 'weaviate',
  endpoint: 'https://your-weaviate-instance.com',
  apiKey: 'your-api-key',
  collection: 'KnowledgeBase',
  embeddingModel: 'text-embedding-3-small',
  embeddingDimension: 1536,

  // 或本地存储（开发环境）
  provider: 'local',
};
```

### 检索配置

```typescript
const retrievalConfig = {
  topK: 10,              // 返回结果数量
  minScore: 0.1,         // 最小相关分数
  vectorWeight: 0.7,      // 向量检索权重
  keywordWeight: 0.3,     // 关键词检索权重
  useRerank: true,       // 是否重排序
  rrfK: 60,              // RRF 参数
};
```

### RAG 问答配置

```typescript
const qaConfig = {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
  includeCitations: true,
  maxSourceChunks: 5,
};
```

## 高级用法

### 批量处理文档

```typescript
const files = [file1, file2, file3];

for (const file of files) {
  const doc = await documentProcessor.parseDocument(file, file.type);
  const chunks = await documentProcessor.chunkDocument(doc);
  const chunksWithEmbeddings = await documentProcessor.generateEmbeddings(chunks);
  await vectorStore.addChunks(chunksWithEmbeddings);
}
```

### 带过滤的检索

```typescript
const results = await retriever.retrieve({
  query: '搜索关键词',
  filters: {
    documentId: 'doc_123',
    category: 'technical',
  },
  topK: 5,
});
```

### 流式问答

```typescript
for await (const chunk of qa.askStream('你的问题')) {
  process.stdout.write(chunk); // 实时输出
}
```

### 引用追溯

```typescript
const answer = await qa.ask('问题');
const tracer = new CitationTracer();

// 提取引用的文档
const citedIds = tracer.extractCitations(answer.answer, answer.sources);

// 追溯具体段落
const tracedChunks = tracer.traceSourceChunks(answer.answer, answer.chunks);

// 生成引用报告
const report = tracer.generateCitationReport(answer);
```

## 部署指南

### 环境变量

```bash
# Weaviate 配置
WEAVIATE_ENDPOINT=https://your-weaviate-instance.com
WEAVIATE_API_KEY=your-api-key

# OpenAI 配置
OPENAI_API_KEY=your-openai-api-key

# 嵌入模型
EMBEDDING_MODEL=text-embedding-3-small
```

### Docker Compose（Weaviate）

```yaml
version: '3.8'
services:
  weaviate:
    image: semitechnologies/weaviate:latest
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true
      - PERSISTENCE_DATA_PATH=/var/lib/weaviate
      - ENABLE_MODULES=text2vec-openai
      - DEFAULT_VECTORIZER_MODULE=text2vec-openai
      - OPENAI_APIKEY=your-openai-api-key
    volumes:
      - weaviate-data:/var/lib/weaviate

volumes:
  weaviate-data:
```

## 性能优化

### 1. 批量处理

```typescript
// 批量生成嵌入（每批 100 个）
const chunks = await documentProcessor.generateEmbeddings(allChunks);

// 批量添加到向量存储
await vectorStore.addChunks(chunks);
```

### 2. 缓存

```typescript
// 缓存嵌入结果
const embeddingCache = new Map<string, number[]>();

async function getCachedEmbedding(text: string) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text);
  }

  const embedding = await generateEmbedding(text);
  embeddingCache.set(text, embedding);
  return embedding;
}
```

### 3. 异步处理

```typescript
// 异步处理大型文档
const processDocument = async (file: File) => {
  const doc = await documentProcessor.parseDocument(file, file.type);
  const chunks = await documentProcessor.chunkDocument(doc);
  const chunksWithEmbeddings = await documentProcessor.generateEmbeddings(chunks);
  await vectorStore.addChunks(chunksWithEmbeddings);
  return doc.id;
};

// 并行处理多个文档
const results = await Promise.all(files.map(processDocument));
```

## 监控和调试

### 日志记录

```typescript
const documentProcessor = new DocumentProcessor();

// 在生产环境中添加日志
documentProcessor.parseDocument = async (file, mimeType, metadata) => {
  console.log(`Processing document: ${metadata?.title}`);
  console.log(`MIME type: ${mimeType}`);
  console.log(`File size: ${file.size} bytes`);

  const result = await documentProcessor.parseDocument(file, mimeType, metadata);

  console.log(`Processed ${result.content.length} characters`);
  return result;
};
```

### 性能指标

```typescript
const startTime = Date.now();

const answer = await qa.ask(question);

const retrievalTime = answer.metadata?.retrievalTime;
const totalTime = Date.now() - startTime;

console.log(`Retrieval: ${retrievalTime}ms`);
console.log(`Total: ${totalTime}ms`);
console.log(`Confidence: ${(answer.confidence * 100).toFixed(1)}%`);
```

## 故障排查

### 问题：嵌入生成失败

**原因**: OpenAI API key 无效或超限

**解决**:
```bash
# 检查 API key
echo $OPENAI_API_KEY

# 更新环境变量
export OPENAI_API_KEY=your-new-key
```

### 问题：向量搜索无结果

**原因**: 文档未正确添加或 embedding 维度不匹配

**解决**:
```typescript
// 检查文档是否添加
const chunks = await vectorStore.getDocumentChunks(documentId);
console.log(`Found ${chunks.length} chunks`);

// 检查 embedding 维度
const chunk = chunks[0];
console.log(`Embedding dimension: ${chunk.embedding?.length}`);
```

### 问题：答案不准确

**原因**: 检索参数配置不当

**解决**:
```typescript
// 调整检索参数
const retrievalConfig = {
  topK: 20,           // 增加结果数量
  minScore: 0.05,     // 降低最小分数
  useRerank: true,    // 启用重排序
};
```

## 开发路线图

### 已完成 ✅
- [x] 文档解析（PDF/Word/MD/HTML/TXT）
- [x] 递归分块策略
- [x] 批量嵌入生成
- [x] 向量存储抽象接口
- [x] Weaviate 实现
- [x] 本地向量存储
- [x] 混合检索（向量+关键词）
- [x] RRF 排序算法
- [x] 重排序支持
- [x] RAG 问答
- [x] 引用追溯

### 计划中 📋
- [ ] 语义分块（基于句子相似度）
- [ ] Pinecone 集成
- [ ] Qdrant 集成
- [ ] 多模态支持（图片、表格）
- [ ] 文档版本管理
- [ ] A/B 测试框架
- [ ] 性能监控仪表板

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
